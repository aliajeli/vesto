import 'server-only';
import prisma from './db';
import { parseJsonArray, safeFirstImage } from './pricing';

/** تبدیل رکورد Prisma به شکل سبک برای کلاینت */
export function shapeProduct(p) {
  const totalStock = p.variants ? p.variants.reduce((s, v) => s + v.stock, 0) : null;
  const inStock = p.variants ? p.variants.filter((v) => v.stock > 0) : [];
  const def = inStock[0] || null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDesc: p.shortDesc,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    image: safeFirstImage(p.images),
    images: parseJsonArray(p.images),
    tags: parseJsonArray(p.tags),
    categoryName: p.category?.name || null,
    categorySlug: p.category?.slug || null,
    brandName: p.brand?.name || null,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
    totalStock,
    defaultVariantId: def?.id || null,
    defaultSize: def?.size || null,
    defaultColor: def?.color || null,
    defaultColorHex: def?.colorHex || null,
  };
}

export async function getCategoriesTree() {
  const all = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const byParent = new Map();
  for (const c of all) {
    const k = c.parentId || 'root';
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(c);
  }
  return (byParent.get('root') || []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    image: c.image,
    description: c.description,
    parentId: null,
    children: (byParent.get(c.id) || []).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      icon: s.icon,
      parentId: c.id,
    })),
  }));
}

export async function getFlatCategories() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
}

/** جستجو و فیلتر محصولات */
export async function searchProducts({
  q = '',
  category = '',
  brand = '',
  minPrice,
  maxPrice,
  sale = false,
  featured = false,
  isNew = false,
  size = '',
  color = '',
  sort = 'relevance',
  page = 1,
  limit = 24,
  inStockOnly = false,
} = {}) {
  const where = { isActive: true };
  const AND = [];

  if (q && q.trim()) {
    const term = q.trim();
    AND.push({
      OR: [
        { name: { contains: term } },
        { description: { contains: term } },
        { shortDesc: { contains: term } },
        { tags: { contains: term } },
        { sku: { contains: term } },
        { brand: { name: { contains: term } } },
        { category: { name: { contains: term } } },
      ],
    });
  }

  if (category) {
    const cat = await prisma.category.findUnique({
      where: { slug: category },
      include: { children: { select: { id: true } } },
    });
    if (cat) {
      const ids = [cat.id, ...cat.children.map((c) => c.id)];
      AND.push({ categoryId: { in: ids } });
    } else {
      AND.push({ id: '__none__' });
    }
  }

  if (brand) AND.push({ brand: { slug: brand } });
  if (minPrice != null && minPrice !== '') AND.push({ price: { gte: Math.round(Number(minPrice) * 10) } });
  if (maxPrice != null && maxPrice !== '') AND.push({ price: { lte: Math.round(Number(maxPrice) * 10) } });
  if (featured) AND.push({ isFeatured: true });
  if (isNew) AND.push({ isNew: true });
  if (size) AND.push({ variants: { some: { size, stock: { gt: 0 } } } });
  if (color) AND.push({ variants: { some: { color, stock: { gt: 0 } } } });
  if (inStockOnly) AND.push({ variants: { some: { stock: { gt: 0 } } } });
  if (AND.length) where.AND = AND;

  const orderBy =
    sort === 'price-asc' ? { price: 'asc' }
    : sort === 'price-desc' ? { price: 'desc' }
    : sort === 'newest' ? { createdAt: 'desc' }
    : sort === 'popular' ? { soldCount: 'desc' }
    : sort === 'rating' ? { ratingAvg: 'desc' }
    : { createdAt: 'desc' };

  const take = Math.min(60, Math.max(1, Number(limit) || 24));
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;

  let [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { category: true, brand: true, variants: true },
    }),
    prisma.product.count({ where }),
  ]);

  let shaped = items.map(shapeProduct);

  // فیلتر «فقط تخفیف‌دار» در سطح اپلیکیشن (SQLite از مقایسه ستون‌ها پشتیبانی محدودی دارد)
  if (sale) {
    const all = await prisma.product.findMany({
      where: { ...where, compareAtPrice: { not: null } },
      orderBy,
      include: { category: true, brand: true, variants: true },
    });
    const onlySale = all.filter((p) => p.compareAtPrice > p.price);
    total = onlySale.length;
    shaped = onlySale.slice(skip, skip + take).map(shapeProduct);
  }

  return { items: shaped, total, page: Number(page) || 1, pages: Math.ceil(total / take) || 1, limit: take };
}

export async function getDiscountedProducts(limit = 8) {
  const rows = await prisma.product.findMany({
    where: { isActive: true, compareAtPrice: { not: null } },
    include: { category: true, brand: true, variants: true },
    orderBy: { soldCount: 'desc' },
    take: 40,
  });
  return rows
    .filter((p) => p.compareAtPrice > p.price)
    .sort((a, b) => (b.compareAtPrice - b.price) / b.compareAtPrice - (a.compareAtPrice - a.price) / a.compareAtPrice)
    .slice(0, limit)
    .map(shapeProduct);
}

export async function getProductBySlug(slug) {
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      brand: true,
      variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
      reviews: {
        where: { isApproved: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!p || !p.isActive) return null;
  return {
    ...shapeProduct(p),
    description: p.description,
    material: p.material,
    careGuide: p.careGuide,
    origin: p.origin,
    weightGram: p.weightGram,
    sku: p.sku,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    variants: p.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      stock: v.stock,
      priceDiff: v.priceDiff,
    })),
    reviews: p.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: r.user?.name || 'کاربر وستو',
      createdAt: r.createdAt,
    })),
  };
}

export async function getRelatedProducts(product, limit = 8) {
  if (!product) return [];
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: product.id },
      ...(product.categorySlug ? { category: { slug: product.categorySlug } } : {}),
    },
    include: { category: true, brand: true, variants: true },
    orderBy: { soldCount: 'desc' },
    take: limit,
  });
  if (rows.length >= 4) return rows.map(shapeProduct);
  const extra = await prisma.product.findMany({
    where: { isActive: true, id: { not: product.id } },
    include: { category: true, brand: true, variants: true },
    orderBy: { soldCount: 'desc' },
    take: limit,
  });
  const seen = new Set(rows.map((r) => r.id));
  return [...rows, ...extra.filter((e) => !seen.has(e.id))].slice(0, limit).map(shapeProduct);
}

export async function getFilterFacets() {
  const [brands, variants, agg] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: 'asc' } }),
    prisma.productVariant.findMany({
      where: { stock: { gt: 0 }, product: { isActive: true } },
      select: { size: true, color: true, colorHex: true },
    }),
    prisma.product.aggregate({ where: { isActive: true }, _min: { price: true }, _max: { price: true } }),
  ]);

  const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => {
    const order = ['S', 'M', 'L', 'XL', 'XXL'];
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return String(a).localeCompare(String(b), 'fa', { numeric: true });
  });

  const colorMap = new Map();
  for (const v of variants) if (!colorMap.has(v.color)) colorMap.set(v.color, v.colorHex);

  return {
    brands: brands.map((b) => ({ name: b.name, slug: b.slug })),
    sizes,
    colors: [...colorMap].map(([name, hex]) => ({ name, hex })),
    minPrice: Math.round((agg._min.price || 0) / 10),
    maxPrice: Math.round((agg._max.price || 0) / 10),
  };
}
