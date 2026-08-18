'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import { Icons, Drawer, EmptyState, toFa, group, Badge } from '@/components/ui';

const SORTS = [
  { id: 'relevance', label: 'پیش‌فرض' },
  { id: 'newest', label: 'جدیدترین' },
  { id: 'popular', label: 'پرفروش‌ترین' },
  { id: 'price-asc', label: 'ارزان‌ترین' },
  { id: 'price-desc', label: 'گران‌ترین' },
  { id: 'rating', label: 'بیشترین امتیاز' },
];

const COLS = {
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
};

export default function ShopClient({ categories, facets, layout }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [data, setData] = useState({ items: [], total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = sp.get('q') || '';
  const category = sp.get('category') || '';
  const brand = sp.get('brand') || '';
  const size = sp.get('size') || '';
  const color = sp.get('color') || '';
  const sale = sp.get('sale') === '1';
  const inStock = sp.get('inStock') === '1';
  const sort = sp.get('sort') || 'relevance';
  const page = Number(sp.get('page') || 1);
  const minPrice = sp.get('minPrice') || '';
  const maxPrice = sp.get('maxPrice') || '';

  const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);
  useEffect(() => setPriceRange([minPrice, maxPrice]), [minPrice, maxPrice]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (category) p.set('category', category);
    if (brand) p.set('brand', brand);
    if (size) p.set('size', size);
    if (color) p.set('color', color);
    if (sale) p.set('sale', '1');
    if (inStock) p.set('inStock', '1');
    if (sort !== 'relevance') p.set('sort', sort);
    if (minPrice) p.set('minPrice', minPrice);
    if (maxPrice) p.set('maxPrice', maxPrice);
    if (page > 1) p.set('page', String(page));
    return p;
  }, [q, category, brand, size, color, sale, inStock, sort, minPrice, maxPrice, page]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const p = new URLSearchParams(qs);
    p.set('limit', String(layout.columns === 5 ? 20 : layout.columns === 3 ? 12 : 16));
    fetch(`/api/products?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setData({ items: d.items || [], total: d.total || 0, pages: d.pages || 1, page: d.page || 1 }); })
      .catch(() => { if (alive) setData({ items: [], total: 0, pages: 1, page: 1 }); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [qs, layout.columns]);

  const setParam = useCallback(
    (key, value, resetPage = true) => {
      const p = new URLSearchParams(qs);
      if (value === '' || value == null || value === false) p.delete(key);
      else p.set(key, value === true ? '1' : String(value));
      if (resetPage) p.delete('page');
      router.push(`/shop${p.toString() ? `?${p}` : ''}`, { scroll: false });
    },
    [qs, router]
  );

  const clearAll = () => router.push('/shop');

  const activeFilters = [
    q && { key: 'q', label: `جستجو: ${q}` },
    category && { key: 'category', label: findCatName(categories, category) },
    brand && { key: 'brand', label: facets.brands.find((b) => b.slug === brand)?.name || brand },
    size && { key: 'size', label: `سایز ${size}` },
    color && { key: 'color', label: color },
    sale && { key: 'sale', label: 'فقط تخفیف‌دار' },
    inStock && { key: 'inStock', label: 'فقط موجود' },
    (minPrice || maxPrice) && { key: 'price', label: `قیمت ${minPrice ? toFa(group(minPrice)) : '۰'} تا ${maxPrice ? toFa(group(maxPrice)) : '∞'}` },
  ].filter(Boolean);

  const grid = COLS[layout.columns] || COLS[4];

  const FilterPanel = (
    <div className="space-y-6">
      {/* دسته‌بندی */}
      <Group title="دسته‌بندی">
        <button onClick={() => setParam('category', '')} className={`filter-row ${!category ? 'active' : ''}`} style={rowStyle(!category)}>
          همه محصولات
        </button>
        {categories.map((c) => (
          <div key={c.id}>
            <button onClick={() => setParam('category', c.slug)} style={rowStyle(category === c.slug)} className="filter-row">
              <span>{c.icon}</span> {c.name}
            </button>
            {(c.children || []).map((sc) => (
              <button key={sc.id} onClick={() => setParam('category', sc.slug)} style={{ ...rowStyle(category === sc.slug), paddingInlineStart: '2rem', fontSize: '.78rem' }} className="filter-row">
                {sc.name}
              </button>
            ))}
          </div>
        ))}
      </Group>

      {/* قیمت */}
      <Group title="محدوده قیمت (تومان)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="از"
            value={priceRange[0]}
            onChange={(e) => setPriceRange([e.target.value, priceRange[1]])}
            className="input text-xs"
          />
          <span className="text-muted">—</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="تا"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], e.target.value])}
            className="input text-xs"
          />
        </div>
        <button
          onClick={() => {
            const p = new URLSearchParams(qs);
            priceRange[0] ? p.set('minPrice', priceRange[0]) : p.delete('minPrice');
            priceRange[1] ? p.set('maxPrice', priceRange[1]) : p.delete('maxPrice');
            p.delete('page');
            router.push(`/shop?${p}`, { scroll: false });
          }}
          className="btn btn-soft btn-sm w-full mt-2"
        >
          اعمال قیمت
        </button>
        <p className="text-[10px] text-muted mt-1.5">
          بازه موجود: {toFa(group(facets.minPrice))} تا {toFa(group(facets.maxPrice))} تومان
        </p>
      </Group>

      {/* سایز */}
      {facets.sizes.length > 0 && (
        <Group title="سایز">
          <div className="flex flex-wrap gap-1.5">
            {facets.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setParam('size', size === s ? '' : s)}
                className="px-3 py-1.5 rounded-theme text-xs font-bold border transition-colors"
                style={size === s
                  ? { background: 'var(--primary)', color: 'var(--primary-contrast)', borderColor: 'var(--primary)' }
                  : { borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                {s}
              </button>
            ))}
          </div>
        </Group>
      )}

      {/* رنگ */}
      {facets.colors.length > 0 && (
        <Group title="رنگ">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => (
              <button
                key={c.name}
                onClick={() => setParam('color', color === c.name ? '' : c.name)}
                title={c.name}
                className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 relative"
                style={{ background: c.hex, borderColor: color === c.name ? 'var(--primary)' : 'var(--border)' }}
              >
                {color === c.name && <Icons.check size={14} className="absolute inset-0 m-auto" style={{ color: '#fff', filter: 'drop-shadow(0 0 2px rgba(0,0,0,.8))' }} />}
              </button>
            ))}
          </div>
        </Group>
      )}

      {/* برند */}
      {facets.brands.length > 0 && (
        <Group title="برند">
          {facets.brands.map((b) => (
            <button key={b.slug} onClick={() => setParam('brand', brand === b.slug ? '' : b.slug)} style={rowStyle(brand === b.slug)} className="filter-row">
              {b.name}
            </button>
          ))}
        </Group>
      )}

      {/* سایر */}
      <Group title="سایر">
        <Check label="فقط محصولات تخفیف‌دار" checked={sale} onChange={(v) => setParam('sale', v)} />
        <Check label="فقط کالاهای موجود" checked={inStock} onChange={(v) => setParam('inStock', v)} />
      </Group>
    </div>
  );

  return (
    <div className="container-app py-6 md:py-8">
      {/* عنوان */}
      <div className="mb-5">
        <h1 className="text-xl md:text-3xl font-extrabold">
          {q ? `نتایج جستجو برای «${q}»` : category ? findCatName(categories, category) : sale ? 'محصولات تخفیف‌دار' : 'همه محصولات'}
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1.5">
          {loading ? 'در حال جستجو…' : `${toFa(group(data.total))} محصول یافت شد`}
        </p>
      </div>

      {/* فیلترهای فعال */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                if (f.key === 'price') {
                  const p = new URLSearchParams(qs);
                  p.delete('minPrice'); p.delete('maxPrice'); p.delete('page');
                  router.push(`/shop?${p}`, { scroll: false });
                } else setParam(f.key, '');
              }}
              className="badge gap-1.5 py-1.5 px-3 hover:opacity-80"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              {f.label}
              <Icons.close size={12} />
            </button>
          ))}
          <button onClick={clearAll} className="text-[11px] text-muted hover:text-[var(--danger)] font-bold">
            پاک کردن همه
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* سایدبار دسکتاپ */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 card p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
            {FilterPanel}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* نوار ابزار */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setFiltersOpen(true)} className="btn btn-ghost btn-sm lg:hidden">
              <Icons.filter size={15} />
              فیلترها
              {activeFilters.length > 0 && (
                <span className="badge" style={{ background: 'var(--primary)', color: 'var(--primary-contrast)' }}>
                  {toFa(activeFilters.length)}
                </span>
              )}
            </button>
            <div className="flex-1" />
            <label className="text-xs text-muted hidden sm:block">مرتب‌سازی:</label>
            <select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="input w-auto text-xs py-2 cursor-pointer"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* شبکه محصولات */}
          {loading ? (
            <div className={`grid gap-3 md:gap-5 ${grid}`}>
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={Icons.search}
              title="محصولی یافت نشد"
              hint="فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید."
              action={<button onClick={clearAll} className="btn btn-primary mt-2">حذف فیلترها</button>}
            />
          ) : (
            <>
              <div className={`grid gap-3 md:gap-5 ${grid}`}>
                {data.items.map((p, i) => (
                  <ProductCard key={p.id} product={p} variant={layout.card} priority={i < 4} />
                ))}
              </div>

              {/* صفحه‌بندی */}
              {data.pages > 1 && (
                <nav className="flex items-center justify-center gap-1.5 mt-10 flex-wrap" aria-label="صفحه‌بندی">
                  <button
                    disabled={data.page <= 1}
                    onClick={() => setParam('page', data.page - 1, false)}
                    className="btn btn-ghost btn-sm disabled:opacity-40"
                  >
                    <Icons.chevronRight size={15} /> قبلی
                  </button>
                  {pageNumbers(data.page, data.pages).map((n, i) =>
                    n === '…' ? (
                      <span key={`e${i}`} className="px-2 text-muted">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setParam('page', n, false)}
                        className="w-9 h-9 rounded-theme text-xs font-extrabold tabular transition-colors"
                        style={n === data.page
                          ? { background: 'var(--primary)', color: 'var(--primary-contrast)' }
                          : { background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                      >
                        {toFa(n)}
                      </button>
                    )
                  )}
                  <button
                    disabled={data.page >= data.pages}
                    onClick={() => setParam('page', data.page + 1, false)}
                    className="btn btn-ghost btn-sm disabled:opacity-40"
                  >
                    بعدی <Icons.chevronLeft size={15} />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* فیلتر موبایل */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="فیلترها"
        side="right"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button onClick={clearAll} className="btn btn-ghost">پاک کردن</button>
            <button onClick={() => setFiltersOpen(false)} className="btn btn-primary">
              نمایش {toFa(group(data.total))} محصول
            </button>
          </div>
        }
      >
        <div className="p-4">{FilterPanel}</div>
      </Drawer>

      <style jsx global>{`
        .filter-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          text-align: start;
          padding: 0.5rem 0.7rem;
          border-radius: calc(var(--radius) * 0.55);
          font-size: 0.82rem;
          font-weight: 700;
          transition: all 0.15s;
        }
        .filter-row:hover { background: var(--surface-2); }
      `}</style>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-extrabold mb-2.5 text-muted">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function rowStyle(active) {
  return active
    ? { background: 'var(--primary-soft)', color: 'var(--primary)' }
    : { color: 'var(--text-muted)' };
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer select-none">
      <span
        className="w-[18px] h-[18px] rounded-[5px] border grid place-items-center transition-colors shrink-0"
        style={{ borderColor: checked ? 'var(--primary)' : 'var(--border)', background: checked ? 'var(--primary)' : 'transparent' }}
        onClick={() => onChange(!checked)}
      >
        {checked && <Icons.check size={12} style={{ color: 'var(--primary-contrast)' }} strokeWidth={3} />}
      </span>
      <span className="text-xs font-bold" onClick={() => onChange(!checked)}>{label}</span>
    </label>
  );
}

function findCatName(categories, slug) {
  for (const c of categories) {
    if (c.slug === slug) return c.name;
    for (const s of c.children || []) if (s.slug === slug) return s.name;
  }
  return 'دسته‌بندی';
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  if (current > 3) out.push('…');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) out.push(i);
  if (current < total - 2) out.push('…');
  out.push(total);
  return out;
}
