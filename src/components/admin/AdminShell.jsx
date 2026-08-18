'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icons } from '@/components/ui';
import LogoutButton from '@/components/LogoutButton';

const NAV = [
  { group: 'مرور کلی', items: [
    { href: '/admin/panel', label: 'داشبورد', icon: 'grid', exact: true },
    { href: '/admin/panel/analytics', label: 'تحلیل فروش', icon: 'chart' },
    { href: '/admin/panel/accounting', label: 'حسابداری', icon: 'wallet' },
  ]},
  { group: 'فروشگاه', items: [
    { href: '/admin/panel/products', label: 'محصولات', icon: 'package' },
    { href: '/admin/panel/categories', label: 'دسته‌بندی‌ها', icon: 'layers' },
    { href: '/admin/panel/orders', label: 'سفارش‌ها', icon: 'box' },
    { href: '/admin/panel/coupons', label: 'کدهای تخفیف', icon: 'ticket' },
    { href: '/admin/panel/reviews', label: 'نظرات', icon: 'star' },
  ]},
  { group: 'مدیریت', items: [
    { href: '/admin/panel/customers', label: 'مشتریان', icon: 'users' },
    { href: '/admin/panel/appearance', label: 'ظاهر و تم', icon: 'sparkle' },
    { href: '/admin/panel/settings', label: 'تنظیمات', icon: 'settings' },
    { href: '/admin/panel/audit', label: 'حسابرسی و امنیت', icon: 'shield' },
  ]},
];

export default function AdminShell({ children, user, storeName }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const Sidebar = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-line shrink-0">
        <span className="w-8 h-8 rounded-theme grid place-items-center font-extrabold shrink-0" style={{ background: 'var(--primary)', color: 'var(--primary-contrast)' }}>
          V
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold truncate">{storeName}</p>
          <p className="text-[10px] text-muted">پنل مدیریت</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="text-[10px] font-extrabold text-muted px-3 mb-1.5">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const I = Icons[it.icon];
                const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-theme text-[13px] font-bold transition-colors"
                    style={active
                      ? { background: 'var(--primary)', color: 'var(--primary-contrast)' }
                      : { color: 'var(--text-muted)' }}
                  >
                    <I size={17} className="shrink-0" />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-line shrink-0 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="w-8 h-8 rounded-full grid place-items-center text-xs font-extrabold shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            {user.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold truncate">{user.name}</p>
            <p className="text-[10px] text-muted truncate" dir="ltr">{user.email}</p>
          </div>
        </div>
        <Link href="/" target="_blank" className="btn btn-ghost btn-sm w-full">
          <Icons.eye size={14} /> مشاهده سایت
        </Link>
        <LogoutButton className="btn btn-ghost btn-sm w-full" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-soft)' }}>
      {/* سایدبار دسکتاپ */}
      <aside
        className="hidden lg:flex w-64 shrink-0 flex-col fixed inset-y-0 right-0 z-40"
        style={{ background: 'var(--surface)', borderInlineStart: '1px solid var(--border)' }}
      >
        {Sidebar}
      </aside>

      {/* سایدبار موبایل */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-[150]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 flex flex-col animate-slide-in" style={{ background: 'var(--surface)' }}>
            {Sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 lg:mr-64 min-w-0 flex flex-col">
        {/* هدر موبایل */}
        <header
          className="lg:hidden sticky top-0 z-30 h-14 flex items-center gap-3 px-4 glass"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <button onClick={() => setOpen(true)} aria-label="منو" className="touch-target grid place-items-center -mr-2">
            <Icons.menu size={22} />
          </button>
          <p className="font-extrabold text-sm flex-1 truncate">{storeName} — مدیریت</p>
          <Link href="/" target="_blank" aria-label="مشاهده سایت" className="text-muted">
            <Icons.eye size={19} />
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
