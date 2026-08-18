import { notFound } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import ProductDetail from './ProductDetail';
import ProductCard from '@/components/ProductCard';
import { getProductBySlug, getRelatedProducts } from '@/lib/queries';
import { getPublicSettings } from '@/lib/settings';
import { Icons } from '@/components/icons';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProductBySlug(decodeURIComponent(slug));
  if (!p) return { title: 'محصول یافت نشد' };
  return {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.shortDesc,
    openGraph: { title: p.name, description: p.shortDesc, images: p.image ? [p.image] : [] },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) notFound();

  const [related, settings] = await Promise.all([
    getRelatedProducts(product, 8),
    getPublicSettings(),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.shortDesc,
    sku: product.sku || undefined,
    brand: product.brandName ? { '@type': 'Brand', name: product.brandName } : undefined,
    aggregateRating: product.ratingCount
      ? { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: Math.round(product.price / 10),
      priceCurrency: 'IRT',
      availability: product.totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <Shell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="container-app py-4 md:py-6">
        {/* مسیر راهنما */}
        <nav className="flex items-center gap-1.5 text-[11px] md:text-xs text-muted mb-5 flex-wrap" aria-label="مسیر">
          <Link href="/" className="hover:text-ink">خانه</Link>
          <Icons.chevronLeft size={12} />
          <Link href="/shop" className="hover:text-ink">فروشگاه</Link>
          {product.categorySlug && (
            <>
              <Icons.chevronLeft size={12} />
              <Link href={`/shop?category=${product.categorySlug}`} className="hover:text-ink">{product.categoryName}</Link>
            </>
          )}
          <Icons.chevronLeft size={12} />
          <span className="text-ink truncate max-w-[45vw]">{product.name}</span>
        </nav>

        <ProductDetail product={product} settings={settings} />

        {related.length > 0 && (
          <section className="mt-14">
            <div className="flex items-end justify-between mb-5">
              <h2 className="text-lg md:text-2xl font-extrabold">محصولات مشابه</h2>
              <Link href={`/shop?category=${product.categorySlug || ''}`} className="btn btn-ghost btn-sm">
                مشاهده بیشتر <Icons.chevronLeft size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {related.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
