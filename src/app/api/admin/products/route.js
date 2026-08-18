import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, assertCsrf, readJson, validate, sanitizeText, sanitizeUrl } from '@/lib/api';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const variantSchema = z.object({
  id: z.string().optional(),
  size: z.string().trim().min(1, 'سایز الزامی است.').max(20),
  color: z.string().trim().min(1, 'رنگ الزامی است.').max(30),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'کد رنگ نامعتبر است.').default('#000000'),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  priceDiff: z.number().int().default(0),
  sku: z.string().trim().max(40).optional().nullable(),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'نام محصول باید حداقل ۲ نویسه باشد.').max(160),
  slug: z.string().trim().max(180).optional().default(''),
  shortDesc: z.string().max(300).optional().default(''),
  description: z.string().max(10000).optional().default(''),
  price: z.number().int().positive('قیمت باید بزرگ‌تر از صفر باشد.').max(1_000_000_000_000),
  compareAtPrice: z.number().int().min(0).max(1_000_000_000_000).optional().nullable(),
  costPrice: z.number().int().min(0).max(1_000_000_000_000).optional().nullable(),
  sku: z.string().trim().max(40).optional().nullable(),
  barcode: z.string().trim().max(40).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  images: z.array(z.string()).max(10).optional().default([]),
  tags: z.array(z.string().max(30)).max(15).optional().default([]),
  material: z.string().max(160).optional().nullable(),
  careGuide: z.string().max(600).optional().nullable(),
  origin: z.string().max(80).optional().nullable(),
  weightGram: z.number().int().min(0).max(100000).optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  seoTitle: z.string().max(160).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  variants: z.array(variantSchema).max(60).optional().default([]),
});

function slugify(s) {
  return String(s)
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 180) || `p-${Date.now()}`;
}

async function uniqueSlug(base, ignoreId) {
  let slug = base;
  for (let i = 0; i < 40; i++) {
    const found = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === ignoreId) return slug;
    slug = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
}

export async function GET(req) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const p = await prisma.product.findUnique({ where: { id }, include: { variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] } } });
      if (!p) return fail('محصول یافت نشد.', 404);
      return ok({ product: { ...p, images: safeJson(p.images), tags: safeJson(p.tags) } });
    }

    const q = (searchParams.get('q') || '').trim();
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const where = q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { slug: { contains: q } }] } : {};

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { category: { select: { name: true } }, brand: { select: { name: true } }, variants: { select: { stock: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    return ok({
      items: items.map((p) => ({
        id: p.id, name: p.name, slug: p.slug, price: p.price, compareAtPrice: p.compareAtPrice,
        costPrice: p.costPrice, sku: p.sku, isActive: p.isActive, isFeatured: p.isFeatured, isNew: p.isNew,
        image: safeJson(p.images)[0] || '', categoryName: p.category?.name || '', brandName: p.brand?.name || '',
        stock: p.variants.reduce((s, v) => s + v.stock, 0), soldCount: p.soldCount, ratingAvg: p.ratingAvg,
      })),
      total, page, pages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const body = await readJson(req, 8_000_000);
    const d = validate(productSchema, body);

    const slug = await uniqueSlug(d.slug ? slugify(d.slug) : slugify(d.name), d.id);
    const images = d.images.map(sanitizeUrl).filter(Boolean);
    const tags = d.tags.map((t) => sanitizeText(t, 30)).filter(Boolean);

    const base = {
      name: sanitizeText(d.name, 160),
      slug,
      shortDesc: sanitizeText(d.shortDesc, 300),
      description: sanitizeText(d.description, 10000),
      price: d.price,
      compareAtPrice: d.compareAtPrice || null,
      costPrice: d.costPrice || null,
      sku: d.sku ? sanitizeText(d.sku, 40) : null,
      barcode: d.barcode ? sanitizeText(d.barcode, 40) : null,
      categoryId: d.categoryId || null,
      brandId: d.brandId || null,
      images: JSON.stringify(images),
      tags: JSON.stringify(tags),
      material: d.material ? sanitizeText(d.material, 160) : null,
      careGuide: d.careGuide ? sanitizeText(d.careGuide, 600) : null,
      origin: d.origin ? sanitizeText(d.origin, 80) : null,
      weightGram: d.weightGram ?? null,
      isActive: d.isActive,
      isFeatured: d.isFeatured,
      isNew: d.isNew,
      seoTitle: d.seoTitle ? sanitizeText(d.seoTitle, 160) : null,
      seoDescription: d.seoDescription ? sanitizeText(d.seoDescription, 300) : null,
    };

    if (d.sku) {
      const dup = await prisma.product.findUnique({ where: { sku: base.sku }, select: { id: true } });
      if (dup && dup.id !== d.id) return fail('این SKU قبلاً برای محصول دیگری ثبت شده است.', 409);
    }

    // یکتاسازی ترکیب سایز/رنگ
    const seen = new Set();
    const variants = [];
    for (const v of d.variants) {
      const key = `${v.size.trim()}|${v.color.trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      variants.push({
        size: sanitizeText(v.size, 20), color: sanitizeText(v.color, 30),
        colorHex: v.colorHex, stock: v.stock, priceDiff: v.priceDiff,
        sku: v.sku ? sanitizeText(v.sku, 40) : null,
      });
    }

    let product;
    if (d.id) {
      const before = await prisma.product.findUnique({ where: { id: d.id }, include: { variants: true } });
      if (!before) return fail('محصول یافت نشد.', 404);
      product = await prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id: d.id }, data: base });
        if (d.variants.length) {
          // حذف تنوع‌هایی که در لیست جدید نیستند و سفارشی ندارند
          await tx.productVariant.deleteMany({ where: { productId: d.id } });
          await tx.productVariant.createMany({ data: variants.map((v) => ({ ...v, productId: d.id })) });
        }
        return tx.product.findUnique({ where: { id: d.id }, include: { variants: true } });
      });
      const meta = await clientMeta();
      await logAudit({
        userId: admin.id, actorName: admin.name, action: 'ویرایش محصول', entity: 'Product', entityId: d.id,
        severity: 'INFO', before: JSON.stringify({ name: before.name, price: before.price, isActive: before.isActive }),
        after: JSON.stringify({ name: base.name, price: base.price, isActive: base.isActive }), ...meta,
      });
    } else {
      product = await prisma.product.create({
        data: { ...base, variants: { create: variants } },
        include: { variants: true },
      });
      const meta = await clientMeta();
      await logAudit({
        userId: admin.id, actorName: admin.name, action: 'افزودن محصول', entity: 'Product', entityId: product.id,
        severity: 'INFO', after: JSON.stringify({ name: base.name, price: base.price }), ...meta,
      });
    }

    return ok({ product: { id: product.id, slug: product.slug } });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const body = await readJson(req);
    const { id, field, value } = body || {};
    if (!id || !['isActive', 'isFeatured', 'isNew'].includes(field)) return fail('درخواست نامعتبر است.', 400);

    await prisma.product.update({ where: { id }, data: { [field]: !!value } });
    const meta = await clientMeta();
    await logAudit({
      userId: admin.id, actorName: admin.name, action: 'تغییر وضعیت محصول', entity: 'Product', entityId: id,
      severity: 'INFO', after: JSON.stringify({ [field]: !!value }), ...meta,
    });
    return ok();
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return fail('شناسه محصول ارسال نشده است.', 400);

    const product = await prisma.product.findUnique({ where: { id }, select: { name: true, _count: { select: { items: true } } } });
    if (!product) return fail('محصول یافت نشد.', 404);

    if (product._count.items > 0) {
      // محصول در سفارش‌ها استفاده شده → فقط غیرفعال می‌شود تا تاریخچه حفظ شود
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      const meta = await clientMeta();
      await logAudit({ userId: admin.id, actorName: admin.name, action: 'بایگانی محصول', entity: 'Product', entityId: id, severity: 'WARN', before: JSON.stringify({ name: product.name }), ...meta });
      return ok({ archived: true, message: 'این محصول در سفارش‌های ثبت‌شده استفاده شده؛ به‌جای حذف، غیرفعال شد.' });
    }

    await prisma.product.delete({ where: { id } });
    const meta = await clientMeta();
    await logAudit({ userId: admin.id, actorName: admin.name, action: 'حذف محصول', entity: 'Product', entityId: id, severity: 'WARN', before: JSON.stringify({ name: product.name }), ...meta });
    return ok({ archived: false });
  } catch (e) {
    return handleError(e);
  }
}

function safeJson(s) {
  try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
