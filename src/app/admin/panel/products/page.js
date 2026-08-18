import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { PageHeader, StatCard } from '@/components/admin/AdminUI';
import ProductsManager from '@/components/admin/ProductsManager';
import ExportButton from '@/components/admin/ExportButton';
import { formatCompact, toFaDigits, groupDigits } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'مدیریت محصولات' };

const PAGE_SIZE = 12;

function safeJson(s) {
  try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

export default async function ProductsPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp?.q || '').trim();
  const page = Math.max(1, Number(sp?.page || 1));
  const filter = sp?.filter || 'all';
  const settings = await getSettings();

  const where = {
    ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { slug: { contains: q } }] } : {}),
    ...(filter === 'active' ? { isActive: true } : {}),
    ...(filter === 'inactive' ? { isActive: false } : {}),
    ...(filter === 'featured' ? { isFeatured: true } : {}),
    ...(filter === 'sale' ? { compareAtPrice: { not: null } } : {}),
  };

  const [rawItems, total, categories, brands, agg, allVariants] = await Promise.all([
    prisma.product.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, parentId: true } }),
    prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.product.aggregate({ _count: true, _sum: { soldCount: true } }),
    prisma.productVariant.aggregate({ _sum: { stock: true }, _count: true }),
  ]);

  const lowStockCount = await prisma.productVariant.count({ where: { stock: { gt: 0, lte: settings.lowStockThreshold } } });
  const outCount = await prisma.productVariant.count({ where: { stock: 0 } });

  const items = rawItems.map((p) => ({
    id: p.id, name: p.name, slug: p.slug, shortDesc: p.shortDesc, description: p.description,
    price: p.price, compareAtPrice: p.compareAtPrice, costPrice: p.costPrice,
    sku: p.sku, barcode: p.barcode, categoryId: p.categoryId, brandId: p.brandId,
    images: safeJson(p.images), tags: safeJson(p.tags),
    material: p.material, careGuide: p.careGuide, origin: p.origin, weightGram: p.weightGram,
    isActive: p.isActive, isFeatured: p.isFeatured, isNew: p.isNew,
    seoTitle: p.seoTitle, seoDescription: p.seoDescription,
    ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, soldCount: p.soldCount, viewCount: p.viewCount,
    categoryName: p.category?.name || '', brandName: p.brand?.name || '',
    stock: p.variants.reduce((s, v) => s + v.stock, 0),
    variants: p.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, colorHex: v.colorHex, stock: v.stock, priceDiff: v.priceDiff, sku: v.sku })),
  }));

  return (
    <>
      <PageHeader title="مدیریت محصولات" subtitle={`${toFaDigits(groupDigits(agg._count))} محصول با ${toFaDigits(groupDigits(allVariants._count))} تنوع رنگ و سایز`} icon="package">
        <ExportButton type="inventory" label="خروجی انبار" />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="کل محصولات" value={toFaDigits(groupDigits(agg._count))} icon="package" />
        <StatCard label="موجودی کل انبار" value={toFaDigits(groupDigits(allVariants._sum.stock || 0))} suffix="عدد" icon="box" tone="accent" />
        <StatCard label="رو به اتمام" value={toFaDigits(lowStockCount)} suffix="تنوع" icon="alert" tone="warning" hint={`آستانه: ${toFaDigits(settings.lowStockThreshold)} عدد`} />
        <StatCard label="ناموجود" value={toFaDigits(outCount)} suffix="تنوع" icon="alert" tone="danger" />
      </div>

      <ProductsManager
        items={items}
        total={total}
        page={page}
        pages={Math.ceil(total / PAGE_SIZE) || 1}
        q={q}
        filter={filter}
        categories={categories}
        brands={brands}
      />
    </>
  );
}
