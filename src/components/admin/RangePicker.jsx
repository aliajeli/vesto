'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/* --------------------------------------------------------- انتخاب بازه */

const PRESETS = [
  { id: 'today', label: 'امروز (ساعتی)' },
  { id: 'yesterday', label: 'دیروز' },
  { id: '7d', label: '۷ روز' },
  { id: '30d', label: '۳۰ روز' },
  { id: '90d', label: '۹۰ روز' },
  { id: '12m', label: '۱۲ ماه' },
  { id: 'all', label: 'کل دوره (سالانه)' },
];

export function RangePicker({ current = '30d' }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const set = (id) => {
    const p = new URLSearchParams(sp.toString());
    p.set('range', id);
    router.push(`${pathname}?${p}`);
  };

  return (
    <div className="flex gap-1 p-1 rounded-theme overflow-x-auto no-scrollbar" style={{ background: 'var(--surface-2)' }}>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => set(p.id)}
          className="px-3 py-1.5 rounded-[calc(var(--radius)*0.5)] text-[11px] font-bold whitespace-nowrap transition-all"
          style={current === p.id
            ? { background: 'var(--primary)', color: 'var(--primary-contrast)' }
            : { color: 'var(--text-muted)' }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
