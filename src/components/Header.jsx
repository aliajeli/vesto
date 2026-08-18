'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useCart, useSettings } from './Providers';
import { Icons, Drawer, money, toFa, ProductImage } from './ui';
import CartDrawer from './CartDrawer';

export default function Header({ categories = [], user = null }) {
  const s = useSettings();
  const cart = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 60);
  }, [searchOpen]);

  // میان‌بر صفحه‌کلید: Ctrl+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doSearch = useCallback((value) => {
    clearTimeout(timer.current);
    if (!value || value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(value)}&limit=6`);
        const data = await res.json();
        setResults(data.items || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, []);

  const roots = categories.filter((c) => !c.parentId);

  const navLinks = [
    { href: '/', label: 'خانه' },
    { href: '/shop', label: 'فروشگاه' },
    { href: '/shop?sale=1', label: 'تخفیف‌ها', accent: true },
    { href: '/shop?sort=newest', label: 'جدیدترین‌ها' },
    { href: '/contact', label: 'تماس با ما' },
  ];

  return (
    <>
      {s.showAnnouncementBar && s.announcementText && (
        <div
          className="text-center text-[11px] xs:text-xs py-2 px-3 font-bold no-print"
          style={{ background: 'var(--primary)', color: 'var(--primary-contrast)' }}
        >
          <span className="inline-flex items-center gap-2">
            <Icons.sparkle size={13} />
            {s.announcementText}
          </span>
        </div>
      )}

      <header
        className={`sticky top-0 z-[100] no-print transition-all duration-300 ${scrolled ? 'glass shadow-theme' : ''}`}
        style={{ background: scrolled ? undefined : 'var(--bg)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="container-app">
          <div className="h-16 flex items-center gap-2 md:gap-5">
            {/* موبایل: منو */}
            <button
              className="lg:hidden touch-target grid place-items-center -mr-2"
              onClick={() => setMenuOpen(true)}
              aria-label="باز کردن منو"
            >
              <Icons.menu size={24} />
            </button>

            {/* لوگو */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              {s.logoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logoImage} alt={s.storeName} className="h-8 w-auto" />
              ) : (
                <span
                  className="text-xl md:text-2xl font-extrabold tracking-[0.18em] transition-transform group-hover:scale-105"
                  style={{ color: 'var(--primary)' }}
                >
                  {s.logoText || 'VESTO'}
                </span>
              )}
            </Link>

            {/* ناوبری دسکتاپ */}
            <nav className="hidden lg:flex items-center gap-1 flex-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-3 py-2 text-sm font-bold rounded-theme transition-colors hover:bg-surface-2"
                  style={l.accent ? { color: 'var(--danger)' } : undefined}
                >
                  {l.label}
                </Link>
              ))}

              {/* مگا منوی دسته‌بندی */}
              <div className="relative group">
                <button className="px-3 py-2 text-sm font-bold rounded-theme hover:bg-surface-2 inline-flex items-center gap-1">
                  دسته‌بندی‌ها
                  <Icons.chevronDown size={15} />
                </button>
                <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                  <div className="card shadow-theme p-3 w-[560px] grid grid-cols-3 gap-1">
                    {roots.map((c) => (
                      <div key={c.id}>
                        <Link
                          href={`/shop?category=${c.slug}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-theme hover:bg-surface-2 text-sm font-bold"
                        >
                          <span>{c.icon}</span>
                          {c.name}
                        </Link>
                        {(c.children || []).map((sc) => (
                          <Link
                            key={sc.id}
                            href={`/shop?category=${sc.slug}`}
                            className="block px-3 py-1.5 pr-9 rounded-theme hover:bg-surface-2 text-xs text-muted hover:text-ink"
                          >
                            {sc.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            <div className="flex-1 lg:flex-none" />

            {/* اکشن‌ها */}
            <div className="flex items-center gap-0.5 md:gap-1">
              <button
                onClick={() => setSearchOpen(true)}
                className="touch-target grid place-items-center rounded-theme hover:bg-surface-2 transition-colors"
                aria-label="جستجو"
              >
                <Icons.search size={21} />
              </button>

              <Link
                href={user ? '/account' : '/login'}
                className="touch-target hidden xs:grid place-items-center rounded-theme hover:bg-surface-2 transition-colors"
                aria-label={user ? 'حساب کاربری' : 'ورود'}
              >
                <Icons.user size={21} />
              </Link>

              <button
                onClick={cart.openDrawer}
                className="relative touch-target grid place-items-center rounded-theme hover:bg-surface-2 transition-colors"
                aria-label={`سبد خرید (${cart.count} کالا)`}
              >
                <Icons.cart size={21} />
                {cart.count > 0 && (
                  <span
                    className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-extrabold tabular"
                    style={{ background: 'var(--primary)', color: 'var(--primary-contrast)' }}
                  >
                    {toFa(cart.count)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* جستجوی سراسری */}
      {searchOpen && (
        <div className="fixed inset-0 z-[170] no-print">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative container-app pt-[12vh]">
            <div className="card shadow-theme max-w-2xl mx-auto overflow-hidden animate-fade-up">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q.trim()) {
                    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
                    setSearchOpen(false);
                  }
                }}
                className="flex items-center gap-3 px-4 border-b border-line"
              >
                <Icons.search size={20} className="text-muted shrink-0" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    doSearch(e.target.value);
                  }}
                  placeholder="نام محصول، دسته‌بندی یا برند..."
                  className="flex-1 bg-transparent py-4 outline-none text-sm"
                />
                {loading && <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />}
                <button type="button" onClick={() => setSearchOpen(false)} className="text-muted hover:text-ink shrink-0">
                  <Icons.close size={20} />
                </button>
              </form>

              <div className="max-h-[52vh] overflow-y-auto">
                {results.length > 0 ? (
                  results.map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 p-3 hover:bg-surface-2 transition-colors border-b border-line last:border-0"
                    >
                      <ProductImage src={p.image} alt={p.name} className="w-12 rounded-theme shrink-0" ratio="1/1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{p.name}</p>
                        <p className="text-xs text-muted">{p.categoryName || '—'}</p>
                      </div>
                      <span className="text-sm font-extrabold shrink-0" style={{ color: 'var(--primary)' }}>
                        {money(p.price)}
                      </span>
                    </Link>
                  ))
                ) : q.trim().length >= 2 && !loading ? (
                  <p className="p-8 text-center text-sm text-muted">نتیجه‌ای یافت نشد.</p>
                ) : (
                  <div className="p-4">
                    <p className="text-xs text-muted mb-2 font-bold">جستجوهای پرطرفدار</p>
                    <div className="flex flex-wrap gap-2">
                      {['پیراهن', 'مانتو', 'کتانی', 'بافت', 'کیف چرم', 'شلوار جین'].map((t) => (
                        <button
                          key={t}
                          onClick={() => { setQ(t); doSearch(t); }}
                          className="btn btn-ghost btn-sm"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* منوی موبایل */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={s.storeNameFa || 'منو'} side="right">
        <nav className="p-4 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-3 rounded-theme hover:bg-surface-2 font-bold text-sm flex items-center justify-between"
              style={l.accent ? { color: 'var(--danger)' } : undefined}
            >
              {l.label}
              <Icons.chevronLeft size={16} className="text-muted" />
            </Link>
          ))}

          <p className="text-xs font-extrabold text-muted mt-4 mb-1 px-3">دسته‌بندی‌ها</p>
          {roots.map((c) => (
            <div key={c.id}>
              <Link href={`/shop?category=${c.slug}`} className="px-3 py-2.5 rounded-theme hover:bg-surface-2 text-sm font-bold flex items-center gap-2">
                <span>{c.icon}</span> {c.name}
              </Link>
              {(c.children || []).map((sc) => (
                <Link key={sc.id} href={`/shop?category=${sc.slug}`} className="px-3 py-2 pr-10 rounded-theme hover:bg-surface-2 text-xs text-muted block">
                  {sc.name}
                </Link>
              ))}
            </div>
          ))}

          <div className="border-t border-line mt-4 pt-4 flex flex-col gap-1">
            <Link href={user ? '/account' : '/login'} className="px-3 py-3 rounded-theme hover:bg-surface-2 font-bold text-sm flex items-center gap-2">
              <Icons.user size={18} /> {user ? `حساب من (${user.name})` : 'ورود / ثبت‌نام'}
            </Link>
            {user && (
              <Link href="/account/orders" className="px-3 py-3 rounded-theme hover:bg-surface-2 font-bold text-sm flex items-center gap-2">
                <Icons.package size={18} /> سفارش‌های من
              </Link>
            )}
          </div>
        </nav>
      </Drawer>

      <CartDrawer />
    </>
  );
}
