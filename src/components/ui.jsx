'use client';

import { useEffect, useState } from 'react';
import { Icons } from './icons';

export { Icons };

/* --------------------------------------------------------------- اجزای پایه */

export function Spinner({ size = 18, className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Rating({ value = 0, count, size = 14, showCount = true }) {
  const v = Math.round(Number(value) * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1" title={`${value} از ۵`}>
      <span className="inline-flex" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <Icons.star
            key={n}
            size={size}
            style={{ fill: n <= v ? 'var(--warning)' : 'transparent', color: n <= v ? 'var(--warning)' : 'var(--text-muted)' }}
            strokeWidth={1.4}
          />
        ))}
      </span>
      {showCount && count != null && (
        <span className="text-[11px] text-muted tabular">({toFa(count)})</span>
      )}
    </span>
  );
}

export function Badge({ children, tone = 'primary', className = '' }) {
  const map = {
    primary: { background: 'var(--primary-soft)', color: 'var(--primary)' },
    success: { background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)' },
    danger: { background: 'color-mix(in srgb, var(--danger) 16%, transparent)', color: 'var(--danger)' },
    warning: { background: 'color-mix(in srgb, var(--warning) 18%, transparent)', color: 'var(--warning)' },
    muted: { background: 'var(--surface-2)', color: 'var(--text-muted)' },
    solid: { background: 'var(--primary)', color: 'var(--primary-contrast)' },
  };
  return (
    <span className={`badge ${className}`} style={map[tone] || map.primary}>
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center no-print">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative card w-full ${wide ? 'md:max-w-4xl' : 'md:max-w-lg'} max-h-[92vh] flex flex-col animate-fade-up rounded-b-none md:rounded-b-theme`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
          <h3 className="font-extrabold text-base">{title}</h3>
          <button onClick={onClose} aria-label="بستن" className="text-muted hover:text-ink p-1">
            <Icons.close size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer, side = 'left' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const pos = side === 'left' ? 'left-0' : 'right-0';
  const from = side === 'left' ? '-100%' : '100%';
  return (
    <div className="fixed inset-0 z-[160] no-print">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={`absolute top-0 ${pos} h-full w-[min(92vw,420px)] bg-surface border-line flex flex-col`}
        style={{
          borderInlineStartWidth: side === 'left' ? 0 : 1,
          borderInlineEndWidth: side === 'left' ? 1 : 0,
          animation: 'drawerIn .28s cubic-bezier(.22,.9,.3,1) both',
        }}
      >
        <style>{`@keyframes drawerIn{from{transform:translateX(${from})}to{transform:none}}`}</style>
        <header className="flex items-center justify-between px-5 h-16 border-b border-line shrink-0">
          <h3 className="font-extrabold">{title}</h3>
          <button onClick={onClose} aria-label="بستن" className="text-muted hover:text-ink p-1">
            <Icons.close size={22} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-line p-4 shrink-0">{footer}</div>}
      </aside>
    </div>
  );
}

export function EmptyState({ icon: I = Icons.box, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
      <div className="w-16 h-16 rounded-full grid place-items-center" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
        <I size={28} />
      </div>
      <h3 className="font-extrabold text-lg">{title}</h3>
      {hint && <p className="text-sm text-muted max-w-sm leading-7">{hint}</p>}
      {action}
    </div>
  );
}

export function Confirm({ open, title = 'تأیید عملیات', message, onConfirm, onCancel, danger = true, confirmText = 'تأیید' }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={onCancel}>انصراف</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      }
    >
      <p className="text-sm leading-7 text-muted">{message}</p>
    </Modal>
  );
}

export function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 rounded-theme overflow-x-auto no-scrollbar ${className}`} style={{ background: 'var(--surface-2)' }} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className="px-3.5 py-2 rounded-[calc(var(--radius)*0.55)] text-[13px] font-bold whitespace-nowrap transition-all"
          style={
            active === t.id
              ? { background: 'var(--primary)', color: 'var(--primary-contrast)' }
              : { color: 'var(--text-muted)' }
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, hint, id }) {
  const sid = id || `sw-${label}`;
  return (
    <label htmlFor={sid} className="flex items-center gap-3 cursor-pointer select-none py-1">
      <button
        id={sid}
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style={{ background: checked ? 'var(--primary)' : 'var(--border)' }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
          style={{ insetInlineStart: checked ? '1.5rem' : '0.25rem' }}
        />
      </button>
      <span className="flex-1">
        <span className="text-sm font-bold block">{label}</span>
        {hint && <span className="text-xs text-muted block mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

export function CopyButton({ text, className = '' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {}
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? <Icons.check size={14} /> : <Icons.copy size={14} />}
      {done ? 'کپی شد' : 'کپی'}
    </button>
  );
}

/* ---------------------------------------------------------------- ابزارها */

const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
export function toFa(x) {
  return String(x ?? '').replace(/[0-9]/g, (d) => FA[+d]);
}
export function group(n) {
  const v = Math.round(Number(n || 0));
  const s = v < 0 ? '-' : '';
  return s + Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
}
export function money(rial, suffix = 'تومان') {
  return `${toFa(group(Math.round(Number(rial || 0) / 10)))}${suffix ? ' ' + suffix : ''}`;
}
export function faDate(d, withTime = false) {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' } : {}),
    }).format(new Date(d));
  } catch {
    return '—';
  }
}

export function ProductImage({ src, alt, className = '', ratio = '3/4', priority }) {
  const [err, setErr] = useState(false);
  const ok = src && !err;
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`} style={{ aspectRatio: ratio }}>
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || ''}
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setErr(true)}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.06]"
        />
      ) : (
        <div className="w-full h-full grid place-items-center text-muted" style={{ background: 'var(--surface-2)' }}>
          <Icons.package size={34} strokeWidth={1.2} />
        </div>
      )}
    </div>
  );
}
