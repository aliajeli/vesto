import { Icons } from '@/components/icons';
import { toFaDigits as toFa, groupDigits as group, formatPrice as money } from '@/lib/money';

/* ------------------------------------------------------------- کارت آمار */

export function StatCard({ label, value, delta, icon = 'chart', tone = 'primary', hint, suffix }) {
  const I = Icons[icon] || Icons.chart;
  const up = delta > 0;
  const flat = delta === 0 || delta == null;
  const tones = {
    primary: 'var(--primary)',
    success: 'var(--success)',
    danger: 'var(--danger)',
    warning: 'var(--warning)',
    accent: 'var(--accent)',
  };
  const c = tones[tone] || tones.primary;

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="w-10 h-10 rounded-theme grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}>
          <I size={19} />
        </span>
        {!flat && (
          <span
            className="badge text-[10px]"
            style={{
              background: `color-mix(in srgb, ${up ? 'var(--success)' : 'var(--danger)'} 14%, transparent)`,
              color: up ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {up ? '▲' : '▼'} ٪{toFa(Math.abs(delta))}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted mb-1">{label}</p>
      <p className="text-lg md:text-xl font-extrabold tabular truncate">
        {value}
        {suffix && <span className="text-xs text-muted font-bold mr-1">{suffix}</span>}
      </p>
      {hint && <p className="text-[10px] text-muted mt-1.5">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ سربرگ صفحه */

export function PageHeader({ title, subtitle, children, icon }) {
  const I = icon ? Icons[icon] : null;
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div className="min-w-0">
        <h1 className="text-lg md:text-2xl font-extrabold flex items-center gap-2.5">
          {I && (
            <span className="w-9 h-9 rounded-theme grid place-items-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <I size={19} />
            </span>
          )}
          {title}
        </h1>
        {subtitle && <p className="text-xs text-muted mt-1.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------- جدول */

export function DataTable({ columns, rows, empty = 'داده‌ای برای نمایش وجود ندارد.', dense = false }) {
  if (!rows?.length) {
    return <p className="text-sm text-muted text-center py-10">{empty}</p>;
  }
  return (
    <div className="scroll-x -mx-4 md:mx-0 px-4 md:px-0">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="border-b border-line">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`text-${c.align || 'right'} text-[11px] font-extrabold text-muted pb-2.5 px-2 whitespace-nowrap`}
                style={{ width: c.width }}
              >
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} className="border-b border-line last:border-0 hover:bg-[var(--surface-2)] transition-colors">
              {columns.map((c) => (
                <td key={c.key} className={`text-${c.align || 'right'} ${dense ? 'py-2' : 'py-3'} px-2 align-middle`}>
                  {c.render ? c.render(r, i) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------- نشان وضعیت */

export const ORDER_STATUS = {
  PENDING: { label: 'در انتظار پرداخت', color: 'var(--warning)' },
  PAID: { label: 'پرداخت‌شده', color: 'var(--success)' },
  PROCESSING: { label: 'در حال آماده‌سازی', color: 'var(--accent)' },
  SHIPPED: { label: 'ارسال‌شده', color: 'var(--accent)' },
  DELIVERED: { label: 'تحویل‌شده', color: 'var(--success)' },
  CANCELLED: { label: 'لغو‌شده', color: 'var(--danger)' },
  REFUNDED: { label: 'مسترد‌شده', color: 'var(--text-muted)' },
};

export function StatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { label: status, color: 'var(--text-muted)' };
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}>
      {s.label}
    </span>
  );
}

/* ----------------------------------------------------------- نوار پیشرفت */

export function ProgressBar({ value, max, color = 'var(--primary)', showLabel = true }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      {showLabel && <span className="text-[10px] text-muted tabular shrink-0 w-9 text-left">٪{toFa(Math.round(pct))}</span>}
    </div>
  );
}

export { money, toFa, group };
