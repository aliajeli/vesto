'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/ui';

const SORTS = [
  { id: 'spent', label: 'بیشترین خرید' },
  { id: 'orders', label: 'بیشترین سفارش' },
  { id: 'recent', label: 'جدیدترین عضو' },
  { id: 'name', label: 'الفبایی' },
];

export default function CustomerActions({ q, sort }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [search, setSearch] = useState(q || '');

  const nav = (patch) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => { if (!v) p.delete(k); else p.set(k, v); });
    p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <form onSubmit={(e) => { e.preventDefault(); nav({ q: search }); }} className="relative flex-1 min-w-[220px]">
        <Icons.search size={16} className="absolute top-1/2 -translate-y-1/2 text-muted" style={{ insetInlineStart: 12 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو با نام، ایمیل یا موبایل…"
          className="input"
          style={{ paddingInlineStart: 38 }}
        />
      </form>
      <div className="flex gap-1 p-1 rounded-theme overflow-x-auto no-scrollbar" style={{ background: 'var(--surface-2)' }}>
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => nav({ sort: s.id })}
            className="px-3 py-1.5 rounded-[calc(var(--radius)*0.5)] text-[11px] font-bold whitespace-nowrap transition-all"
            style={sort === s.id ? { background: 'var(--primary)', color: 'var(--primary-contrast)' } : { color: 'var(--text-muted)' }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
