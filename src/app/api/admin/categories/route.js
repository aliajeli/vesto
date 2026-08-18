import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, assertCsrf, readJson, validate, sanitizeText, sanitizeUrl } from '@/lib/api';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const catSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'نام دسته‌بندی باید حداقل ۲ نویسه باشد.').max(80),
  slug: z.string().trim().max(90).optional().default(''),
  description: z.string().max(500).optional().default(''),
  image: z.string().max(3_000_000).optional().default(''),
  icon: z.string().max(40).optional().default(''),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

const brandSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'نام برند باید حداقل ۲ نویسه باشد.').max(60),
  slug: z.string().trim().max(70).optional().default(''),
  logo: z.string().max(3_000_000).optional().default(''),
});

function slugify(s) {
  return String(s).trim().replace(/[\s_]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 90) || `c-${Date.now()}`;
}

async function unique(model, base, ignoreId) {
  let slug = base;
  for (let i = 0; i < 40; i++) {
    const found = await prisma[model].findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === ignoreId) return slug;
    slug = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
}

export async function GET() {
  try {
    await requireAdmin();
    const [categories, brands] = await Promise.all([
      prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true, children: true } } } }),
      prisma.brand.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } }),
    ]);
    return ok({ categories, brands });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const body = await readJson(req, 8_000_000);
    const kind = body?.kind === 'brand' ? 'brand' : 'category';

    if (kind === 'brand') {
      const d = validate(brandSchema, body.data || {});
      const name = sanitizeText(d.name, 60);
      const dup = await prisma.brand.findUnique({ where: { name }, select: { id: true } });
      if (dup && dup.id !== d.id) return fail('برندی با این نام قبلاً ثبت شده است.', 409);

      const slug = await unique('brand', d.slug ? slugify(d.slug) : slugify(name), d.id);
      const data = { name, slug, logo: sanitizeUrl(d.logo) || null };

      const brand = d.id
        ? await prisma.brand.update({ where: { id: d.id }, data })
        : await prisma.brand.create({ data });

      const meta = await clientMeta();
      await logAudit({ userId: admin.id, actorName: admin.name, action: d.id ? 'ویرایش برند' : 'افزودن برند', entity: 'Brand', entityId: brand.id, severity: 'INFO', after: JSON.stringify({ name }), ...meta });
      return ok({ brand });
    }

    const d = validate(catSchema, body.data || {});
    const name = sanitizeText(d.name, 80);
    const slug = await unique('category', d.slug ? slugify(d.slug) : slugify(name), d.id);

    // جلوگیری از حلقه در درخت
    let parentId = d.parentId || null;
    if (parentId && d.id) {
      if (parentId === d.id) return fail('یک دسته نمی‌تواند والد خودش باشد.', 400);
      let cur = parentId;
      for (let i = 0; i < 20 && cur; i++) {
        const p = await prisma.category.findUnique({ where: { id: cur }, select: { parentId: true } });
        if (!p) break;
        if (p.parentId === d.id) return fail('ساختار درختی نامعتبر است (حلقه ایجاد می‌شود).', 400);
        cur = p.parentId;
      }
    }

    const data = {
      name, slug,
      description: sanitizeText(d.description, 500) || null,
      image: sanitizeUrl(d.image) || null,
      icon: sanitizeText(d.icon, 40) || null,
      parentId,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
    };

    const category = d.id
      ? await prisma.category.update({ where: { id: d.id }, data })
      : await prisma.category.create({ data });

    const meta = await clientMeta();
    await logAudit({ userId: admin.id, actorName: admin.name, action: d.id ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی', entity: 'Category', entityId: category.id, severity: 'INFO', after: JSON.stringify({ name }), ...meta });
    return ok({ category });
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
    const kind = searchParams.get('kind') === 'brand' ? 'brand' : 'category';
    if (!id) return fail('شناسه ارسال نشده است.', 400);

    if (kind === 'brand') {
      const b = await prisma.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
      if (!b) return fail('برند یافت نشد.', 404);
      if (b._count.products > 0) return fail(`این برند به ${b._count.products} محصول متصل است. ابتدا برند محصولات را تغییر دهید.`, 409);
      await prisma.brand.delete({ where: { id } });
      const meta = await clientMeta();
      await logAudit({ userId: admin.id, actorName: admin.name, action: 'حذف برند', entity: 'Brand', entityId: id, severity: 'WARN', before: JSON.stringify({ name: b.name }), ...meta });
      return ok();
    }

    const c = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
    if (!c) return fail('دسته‌بندی یافت نشد.', 404);
    if (c._count.children > 0) return fail('ابتدا زیردسته‌های این دسته را حذف یا منتقل کنید.', 409);
    if (c._count.products > 0) return fail(`این دسته‌بندی شامل ${c._count.products} محصول است. ابتدا محصولات را منتقل کنید.`, 409);

    await prisma.category.delete({ where: { id } });
    const meta = await clientMeta();
    await logAudit({ userId: admin.id, actorName: admin.name, action: 'حذف دسته‌بندی', entity: 'Category', entityId: id, severity: 'WARN', before: JSON.stringify({ name: c.name }), ...meta });
    return ok();
  } catch (e) {
    return handleError(e);
  }
}
