import Link from 'next/link';
import Shell from '@/components/Shell';
import Hero from '@/components/Hero';
import ProductCard from '@/components/ProductCard';
import CountdownStrip from '@/components/CountdownStrip';
import { getPublicSettings } from '@/lib/settings';
import { LAYOUTS } from '@/lib/themes';
import { getCategoriesTree, getDiscountedProducts, searchProducts } from '@/lib/queries';
import { Icons } from '@/components/icons';

export const dynamic = 'force-dynamic';

const COLS = {
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
};

function Section({ title, subtitle, href, hrefLabel = 'مشاهده همه', children, accent, icon: I }) {
  return (
    <section className="container-app py-8 md:py-12">
      <div className="flex items-end justify-between gap-4 mb-5 md:mb-7">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-extrabold flex items-center gap-2">
            {I && (
              <span className="w-8 h-8 rounded-theme grid place-items-center shrink-0" style={{ background: accent ? 'color-mix(in srgb, var(--danger) 15%, transparent)' : 'var(--primary-soft)', color: accent ? 'var(--danger)' : 'var(--primary)' }}>
                <I size={17} />
              </span>
            )}
            <span className="truncate">{title}</span>
          </h2>
          {subtitle && <p className="text-xs md:text-sm text-muted mt-1.5">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="btn btn-ghost btn-sm shrink-0">
            {hrefLabel}
            <Icons.chevronLeft size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const settings = await getPublicSettings();
  const layout = LAYOUTS[settings.layout] || LAYOUTS.editorial;

  const [discounted, categories, newest, popular, featured] = await Promise.all([
    getDiscountedProducts(layout.columns === 5 ? 10 : 8),
    getCategoriesTree(),
    searchProducts({ sort: 'newest', limit: layout.columns === 5 ? 10 : 8 }),
    searchProducts({ sort: 'popular', limit: layout.columns === 5 ? 10 : 8 }),
    searchProducts({ featured: true, limit: 4 }),
  ]);

  const grid = COLS[layout.columns] || COLS[4];
  const cardVariant = layout.productCard;
  const containerClass =
    layout.container === 'narrow' ? 'container-narrow' : layout.container === 'full' ? 'container-full' : '';

  return (
    <Shell>
      <div className={containerClass ? `${containerClass} mx-auto` : ''}>
        <Hero style={layout.heroStyle === 'carousel' ? 'full' : layout.heroStyle} />

        {/* ---------------- بخش اول: محصولات تخفیف‌دار ---------------- */}
        {discounted.length > 0 && (
          <>
            <CountdownStrip />
            <Section
              title="پیشنهادهای شگفت‌انگیز"
              subtitle="تخفیف‌های محدود روی منتخب کالکشن — تا پایان موجودی"
              href="/shop?sale=1"
              hrefLabel="همه تخفیف‌ها"
              accent
              icon={Icons.tag}
            >
              <div className={`grid gap-3 md:gap-5 ${grid}`}>
                {discounted.map((p, i) => (
                  <ProductCard key={p.id} product={p} variant={cardVariant} priority={i < 4} />
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ---------------- دسته‌بندی‌ها ---------------- */}
        <Section title="خرید بر اساس دسته‌بندی" subtitle="سریع‌ترین راه رسیدن به استایل دلخواه" icon={Icons.grid}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/shop?category=${c.slug}`}
                className="card card-hover p-5 flex flex-col items-center justify-center gap-2.5 text-center min-h-[120px] group"
              >
                <span className="text-3xl transition-transform group-hover:scale-125 duration-300">{c.icon || '🛍'}</span>
                <span className="text-[13px] font-extrabold">{c.name}</span>
                {c.children?.length > 0 && (
                  <span className="text-[10px] text-muted">{c.children.length} زیرشاخه</span>
                )}
              </Link>
            ))}
          </div>
        </Section>

        {/* ---------------- بنر ویژه ---------------- */}
        {featured.items.length >= 2 && (
          <section className="container-app py-4 md:py-8">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: 'کالکشن مردانه', text: 'کژوال تا رسمی، برای هر موقعیت', href: '/shop?category=men', img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=900&h=600&fit=crop&auto=format&q=70' },
                { title: 'کالکشن زنانه', text: 'طراحی روز با دوخت ماندگار', href: '/shop?category=women', img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&h=600&fit=crop&auto=format&q=70' },
              ].map((b) => (
                <Link key={b.href} href={b.href} className="relative rounded-theme overflow-hidden group" style={{ aspectRatio: '16/9' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.img} alt={b.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, transparent, rgba(0,0,0,.68))' }} />
                  <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-8 text-white">
                    <h3 className="text-xl md:text-3xl font-extrabold">{b.title}</h3>
                    <p className="text-xs md:text-sm opacity-90 mt-2">{b.text}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold" style={{ color: 'var(--primary)' }}>
                      مشاهده محصولات <Icons.arrowLeft size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------------- پرفروش‌ترین‌ها ---------------- */}
        <Section title="پرفروش‌ترین‌ها" subtitle="انتخاب محبوب مشتریان وستو" href="/shop?sort=popular" icon={Icons.chart}>
          <div className={`grid gap-3 md:gap-5 ${grid}`}>
            {popular.items.map((p) => (
              <ProductCard key={p.id} product={p} variant={cardVariant} />
            ))}
          </div>
        </Section>

        {/* ---------------- جدیدترین‌ها ---------------- */}
        <Section title="تازه رسیده‌ها" subtitle="آخرین محصولات اضافه‌شده به فروشگاه" href="/shop?sort=newest" icon={Icons.sparkle}>
          <div className={`grid gap-3 md:gap-5 ${grid}`}>
            {newest.items.map((p) => (
              <ProductCard key={p.id} product={p} variant={cardVariant} />
            ))}
          </div>
        </Section>

        {/* ---------------- کد تخفیف ---------------- */}
        <section className="container-app py-8 md:py-12">
          <div
            className="rounded-theme p-7 md:p-12 text-center relative overflow-hidden"
            style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary)' }}
          >
            <Icons.ticket size={120} className="absolute -left-6 -bottom-6 opacity-[0.07]" />
            <Icons.ticket size={90} className="absolute -right-4 -top-4 opacity-[0.07]" />
            <h3 className="text-xl md:text-3xl font-extrabold mb-3">اولین خریدت را با ۲۰٪ تخفیف ثبت کن</h3>
            <p className="text-sm text-muted mb-6 max-w-lg mx-auto leading-7">
              کد زیر را در مرحله‌ی تسویه‌حساب وارد کنید. حداقل خرید ۳ میلیون تومان، حداکثر تخفیف ۱٫۵ میلیون تومان.
            </p>
            <div className="inline-flex items-center gap-3 flex-wrap justify-center">
              <span
                className="px-6 py-3 rounded-theme font-extrabold tracking-[0.2em] text-lg border-2 border-dashed"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--surface)' }}
              >
                WELCOME20
              </span>
              <Link href="/shop" className="btn btn-primary btn-lg">شروع خرید</Link>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
