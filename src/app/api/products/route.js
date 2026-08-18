import { searchProducts } from '@/lib/queries';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const sp = req.nextUrl.searchParams;
    const res = await searchProducts({
      q: sp.get('q') || '',
      category: sp.get('category') || '',
      brand: sp.get('brand') || '',
      minPrice: sp.get('minPrice'),
      maxPrice: sp.get('maxPrice'),
      sale: sp.get('sale') === '1',
      featured: sp.get('featured') === '1',
      isNew: sp.get('new') === '1',
      size: sp.get('size') || '',
      color: sp.get('color') || '',
      sort: sp.get('sort') || 'relevance',
      page: Number(sp.get('page') || 1),
      limit: Number(sp.get('limit') || 24),
      inStockOnly: sp.get('inStock') === '1',
    });
    return ok(res);
  } catch (e) {
    return handleError(e);
  }
}
