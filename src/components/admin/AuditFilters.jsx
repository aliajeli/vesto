'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/ui';

const SEVS = [
  { id: '', label: 'همه سطوح' },
  { id: 'CRITICAL', label: 'بحرانی', color: 'var(--danger)' },
  { id: 'WARN', label: 'هشدار', color: 'var(--warning)' },
  { id: 'INFO', label: 'عادی' },
];

export default function AuditFilters({ severity, action, q, actions }) {
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
      <form onSubmit={(e) => { e.preventDefault(); nav({ q: search }); }} className="relative flex-1 min-w-[200px]">
        <Icons.search size={16} className="absolute top-1/2 -translate-y-1/2 text-muted" style={{ insetInlineStart: 12 }} />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو با نام کاربر، IP یا شناسه…" className="input" style={{ paddingInlineStart: 38 }}
        />
      </form>

      <select className="input w-auto min-w-[170px]" value={action} onChange={(e) => nav({ action: e.target.value })}>
        <option value="">همه عملیات</option>
        {actions.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select>

      <div className="flex gap-1 p-1 rounded-theme" style={{ background: 'var(--surface-2)' }}>
        {SEVS.map((s) => (
          <button
            key={s.id || 'all'}
            onClick={() => nav({ severity: s.id })}
            className="px-3 py-1.5 rounded-[calc(var(--radius)*0.5)] text-[11px] font-bold whitespace-nowrap transition-all"
            style={severity === s.id
              ? { background: s.color || 'var(--primary)', color: s.color ? '#fff' : 'var(--primary-contrast)' }
              : { color: 'var(--text-muted)' }}
          >{s.label}</button>
        ))}
      </div>
    </div>
  );
}
