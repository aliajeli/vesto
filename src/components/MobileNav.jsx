'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './Providers';
import { Icons, toFa } from './ui';

export default function MobileNav({ user }) {
  const cart = useCart();
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'خانه', icon: Icons.home },
    { href: '/shop', label: 'فروشگاه', icon: Icons.grid },
    { href: '#cart', label: 'سبد', icon: Icons.cart, badge: cart.count, action: cart.openDrawer },
    { href: user ? '/account' : '/login', label: user ? 'حساب' : 'ورود', icon: Icons.user },
  ];

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-[110] glass no-print"
        style={{ borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="ناوبری موبایل"
      >
        <div className="grid grid-cols-4">
          {items.map((it) => {
            const active = it.href === pathname || (it.href === '/shop' && pathname.startsWith('/shop'));
            const content = (
              <>
                <span className="relative">
                  <it.icon size={21} strokeWidth={active ? 2.2 : 1.7} />
                  {it.badge > 0 && (
                    <span
                      className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 grid place-items-center rounded-full text-[9px] font-extrabold tabular"
                      style={{ background: 'var(--primary)', color: 'var(--primary-contrast)' }}
                    >
                      {toFa(it.badge)}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold">{it.label}</span>
              </>
            );
            const cls = 'flex flex-col items-center justify-center gap-1 py-2.5 transition-colors';
            const style = { color: active ? 'var(--primary)' : 'var(--text-muted)' };

            return it.action ? (
              <button key={it.label} onClick={it.action} className={cls} style={style} aria-label={it.label}>
                {content}
              </button>
            ) : (
              <Link key={it.label} href={it.href} className={cls} style={style}>
                {content}
              </Link>
            );
          })}
        </div>
      </nav>
      {/* فاصله‌گذار تا محتوا زیر نوار پنهان نشود */}
      <div className="lg:hidden h-[62px]" style={{ marginBottom: 'env(safe-area-inset-bottom)' }} aria-hidden />
    </>
  );
}
