import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { PageHeader, StatCard } from '@/components/admin/AdminUI';
import CategoriesManager from '@/components/admin/CategoriesManager';
import { toFaDigits, groupDigits } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'دسته‌بندی‌ها و برندها' };

export default async function CategoriesPage() {
  await requireAdmin();

  const [categories, brands, uncategorized] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true, children: true } } },
    }),
    prisma.brand.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } }),
    prisma.product.count({ where: { categoryId: null } }),
  ]);

  const plain = categories.map((c) => ({
    id: c.id, name: c.name, slug: c.slug, description: c.description || '', image: c.image || '',
    icon: c.icon || '', parentId: c.parentId, sortOrder: c.sortOrder, isActive: c.isActive,
    productCount: c._count.products, childCount: c._count.children,
  }));

  const brandList = brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug, logo: b.logo || '', productCount: b._count.products }));

  return (
    <>
      <PageHeader title="دسته‌بندی‌ها و برندها" subtitle="ساختار درختی دسته‌ها، برندها و ترتیب نمایش آن‌ها در سایت" icon="layers" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="دسته‌بندی‌ها" value={toFaDigits(plain.length)} icon="layers" />
        <StatCard label="دسته‌های اصلی" value={toFaDigits(plain.filter((c) => !c.parentId).length)} icon="grid" tone="accent" />
        <StatCard label="برندها" value={toFaDigits(brandList.length)} icon="tag" tone="success" />
        <StatCard label="محصولات بدون دسته" value={toFaDigits(groupDigits(uncategorized))} icon="alert" tone={uncategorized ? 'warning' : 'primary'} />
      </div>

      <CategoriesManager categories={plain} brands={brandList} />
    </>
  );
}
