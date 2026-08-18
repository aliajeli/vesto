import { Suspense } from 'react';
import Shell from '@/components/Shell';
import ShopClient from './ShopClient';
import { getCategoriesTree, getFilterFacets } from '@/lib/queries';
import { getPublicSettings } from '@/lib/settings';
import { LAYOUTS } from '@/lib/themes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'فروشگاه' };

export default async function ShopPage() {
  const [categories, facets, settings] = await Promise.all([
    getCategoriesTree(),
    getFilterFacets(),
    getPublicSettings(),
  ]);
  const layout = LAYOUTS[settings.layout] || LAYOUTS.editorial;

  return (
    <Shell>
      <Suspense fallback={<div className="container-app py-20 text-center text-sm text-muted">در حال بارگذاری…</div>}>
        <ShopClient categories={categories} facets={facets} layout={{ columns: layout.columns, card: layout.productCard }} />
      </Suspense>
    </Shell>
  );
}
