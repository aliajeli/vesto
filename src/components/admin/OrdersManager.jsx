'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { apiFetch, useToast } from '@/components/Providers';
import { Icons, Modal, Spinner, ProductImage, CopyButton, money, toFa, group, faDate } from '@/components/ui';
import { StatusBadge, ORDER_STATUS } from '@/components/admin/AdminUI';

const NEXT_STATES = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

const GW = { zibal: 'زیبال', zarinpal: 'زرین‌پال', payping: 'پی‌پینگ', sandbox: 'شبیه‌ساز تست' };
const PAY_STATUS = {
  SUCCESS: { label: 'موفق', color: 'var(--success)' },
  FAILED: { label: 'ناموفق', color: 'var(--danger)' },
  PENDING: { label: 'در انتظار', color: 'var(--warning)' },
  INITIATED: { label: 'آغازشده', color: 'var(--text-muted)' },
  REVERSED: { label: 'برگشت‌خورده', color: 'var(--text-muted)' },
};

export default function OrdersManager({ orders, total, page, pages, q, status, counts }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { push } = useToast();

  const [search, setSearch] = useState(q || '');
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');
  const [printing, setPrinting] = useState(false);

  const nav = useCallback((patch) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v == null) p.delete(k); else p.set(k, v); });
    if (!('page' in patch)) p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, sp]);

  const openOrder = (o) => {
    setOpen(o);
    setTracking(o.trackingCode || '');
    setNote(o.note || '');
  };

  const update = async (patch, msg) => {
    setBusy(true);
    try {
      await apiFetch('/api/admin/orders', { method: 'PATCH', body: { id: open.id, ...patch } });
      push(msg || 'سفارش به‌روزرسانی شد.', 'success');
      setOpen(null);
      router.refresh();
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const printInvoice = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 120);
  };

  const statusTabs = [
    { id: '', label: 'همه', n: Object.values(counts).reduce((s, n) => s + n, 0) },
    ...Object.entries(ORDER_STATUS).map(([id, s]) => ({ id, label: s.label, n: counts[id] || 0 })),
  ];

  return (
    <>
      <div className="card p-3 md:p-4 mb-4 no-print">
        <form onSubmit={(e) => { e.preventDefault(); nav({ q: search }); }} className="relative mb-3">
          <Icons.search size={16} className="absolute top-1/2 -translate-y-1/2 text-muted" style={{ insetInlineStart: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو با شماره سفارش، نام مشتری، موبایل، کد رهگیری یا کد تخفیف…" className="input" style={{ paddingInlineStart: 38 }} />
        </form>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {statusTabs.map((t) => (
            <button
              key={t.id || 'all'}
              onClick={() => nav({ status: t.id })}
              className="px-3 py-1.5 rounded-theme text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5"
              style={status === t.id
                ? { background: 'var(--primary)', color: 'var(--primary-contrast)' }
                : { background: 'var(--surface-2)', color: 'var(--text-muted)' }}
            >
              {t.label}
              <span className="tabular opacity-70">{toFa(group(t.n))}</span>
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <Icons.box size={44} className="mx-auto text-muted mb-3" strokeWidth={1.2} />
          <p className="font-bold">سفارشی با این فیلترها یافت نشد</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b border-line" style={{ background: 'var(--surface-2)' }}>
                  {['شماره سفارش', 'مشتری', 'تاریخ', 'اقلام', 'مبلغ', 'سود', 'وضعیت', ''].map((h, i) => (
                    <th key={i} className="text-right text-[11px] font-extrabold text-muted py-3 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const qty = o.items.reduce((s, i) => s + i.quantity, 0);
                  const profit = o.subtotal - o.discountTotal - o.costTotal;
                  return (
                    <tr key={o.id} className="border-b border-line last:border-0 hover:bg-[var(--surface-2)] cursor-pointer" onClick={() => openOrder(o)}>
                      <td className="py-3 px-3">
                        <p className="text-xs font-extrabold tabular" dir="ltr">{o.orderNumber}</p>
                        {o.trackingCode && <p className="text-[10px] text-muted tabular mt-0.5" dir="ltr">📦 {o.trackingCode}</p>}
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs font-bold truncate max-w-[150px]">{o.customerName}</p>
                        <p className="text-[10px] text-muted tabular" dir="ltr">{toFa(o.customerPhone)}</p>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-muted whitespace-nowrap">{faDate(o.createdAt, true)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          {o.items.slice(0, 3).map((it) => (
                            <div key={it.id} className="w-8 h-10 rounded overflow-hidden shrink-0" title={it.name}>
                              <ProductImage src={it.image} alt="" ratio="3/4" />
                            </div>
                          ))}
                          {o.items.length > 3 && <span className="text-[10px] text-muted">+{toFa(o.items.length - 3)}</span>}
                          <span className="text-[10px] text-muted tabular mr-1">({toFa(qty)})</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs font-extrabold tabular">{money(o.grandTotal)}</p>
                        {o.discountTotal > 0 && <p className="text-[10px] tabular" style={{ color: 'var(--danger)' }}>−{toFa(group(Math.round(o.discountTotal / 10)))}</p>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs tabular font-bold" style={{ color: profit > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {toFa(group(Math.round(profit / 10)))}
                        </span>
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={o.status} /></td>
                      <td className="py-3 px-3 text-left">
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openOrder(o); }}>
                          <Icons.eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 no-print">
          <button disabled={page <= 1} onClick={() => nav({ page: page - 1 })} className="btn btn-soft btn-sm"><Icons.chevronRight size={15} /> قبلی</button>
          <span className="text-xs text-muted tabular px-3">صفحه {toFa(page)} از {toFa(pages)}</span>
          <button disabled={page >= pages} onClick={() => nav({ page: page + 1 })} className="btn btn-soft btn-sm">بعدی <Icons.chevronLeft size={15} /></button>
        </div>
      )}

      {open && (
        <Modal
          open
          wide
          onClose={() => setOpen(null)}
          title={`سفارش ${open.orderNumber}`}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex gap-1.5 flex-wrap">
                {NEXT_STATES[open.status].map((s) => (
                  <button
                    key={s}
                    onClick={() => update({ status: s }, `وضعیت به «${ORDER_STATUS[s].label}» تغییر کرد.`)}
                    disabled={busy}
                    className="btn btn-sm"
                    style={{
                      background: `color-mix(in srgb, ${ORDER_STATUS[s].color} 16%, transparent)`,
                      color: ORDER_STATUS[s].color,
                      border: `1px solid color-mix(in srgb, ${ORDER_STATUS[s].color} 35%, transparent)`,
                    }}
                  >
                    {ORDER_STATUS[s].label}
                  </button>
                ))}
                {NEXT_STATES[open.status].length === 0 && <span className="text-[11px] text-muted">این سفارش در وضعیت نهایی است.</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={printInvoice} className="btn btn-soft btn-sm">
                  {printing ? <Spinner size={14} /> : <Icons.download size={14} />} چاپ فاکتور
                </button>
                <button
                  onClick={() => update({ trackingCode: tracking, note }, 'اطلاعات ذخیره شد.')}
                  disabled={busy}
                  className="btn btn-primary btn-sm"
                >
                  {busy ? <Spinner size={14} /> : <Icons.check size={14} />} ذخیره
                </button>
              </div>
            </div>
          }
        >
          <OrderDetail o={open} tracking={tracking} setTracking={setTracking} note={note} setNote={setNote} />
        </Modal>
      )}
    </>
  );
}

function OrderDetail({ o, tracking, setTracking, note, setNote }) {
  const profit = o.subtotal - o.discountTotal - o.costTotal;
  const okPay = o.payments.find((p) => p.status === 'SUCCESS');

  return (
    <div className="space-y-5">
      {/* خلاصه */}
      <div className="grid sm:grid-cols-4 gap-3">
        <Box label="وضعیت"><StatusBadge status={o.status} /></Box>
        <Box label="مبلغ نهایی"><span className="text-sm font-extrabold tabular">{money(o.grandTotal)}</span></Box>
        <Box label="سود این سفارش"><span className="text-sm font-extrabold tabular" style={{ color: 'var(--success)' }}>{money(profit)}</span></Box>
        <Box label="تاریخ ثبت"><span className="text-xs">{faDate(o.createdAt, true)}</span></Box>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* مشتری */}
        <div className="rounded-theme border border-line p-4">
          <h4 className="text-xs font-extrabold mb-3 flex items-center gap-2"><Icons.user size={14} style={{ color: 'var(--primary)' }} /> اطلاعات مشتری</h4>
          <dl className="space-y-2 text-xs">
            <Field label="نام">{o.customerName} {o.isGuest && <span className="badge text-[9px] mr-1" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>مهمان</span>}</Field>
            <Field label="موبایل"><span className="tabular flex items-center gap-1.5" dir="ltr">{toFa(o.customerPhone)}<CopyButton text={o.customerPhone} /></span></Field>
            {o.customerEmail && <Field label="ایمیل"><span className="tabular" dir="ltr">{o.customerEmail}</span></Field>}
          </dl>
        </div>

        {/* ارسال */}
        <div className="rounded-theme border border-line p-4">
          <h4 className="text-xs font-extrabold mb-3 flex items-center gap-2"><Icons.truck size={14} style={{ color: 'var(--primary)' }} /> اطلاعات ارسال</h4>
          {o.address ? (
            <dl className="space-y-2 text-xs">
              {o.address.province && <Field label="استان / شهر">{o.address.province} — {o.address.city}</Field>}
              <Field label="نشانی"><span className="leading-6">{o.address.line1}</span></Field>
              {o.address.postalCode && <Field label="کد پستی"><span className="tabular">{toFa(o.address.postalCode)}</span></Field>}
              <Field label="روش">{o.shippingMethod === 'express' ? 'پیشتاز (سریع)' : 'پست عادی'}</Field>
            </dl>
          ) : (
            <p className="text-xs text-muted">آدرسی ثبت نشده است.</p>
          )}
          <div className="mt-3 pt-3 border-t border-line no-print">
            <label className="label text-[10px]">کد رهگیری پستی</label>
            <input className="input h-9 text-xs tabular" dir="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="کد ۲۴ رقمی پست" />
          </div>
        </div>
      </div>

      {/* اقلام */}
      <div className="rounded-theme border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line" style={{ background: 'var(--surface-2)' }}>
          <h4 className="text-xs font-extrabold">اقلام سفارش ({toFa(o.items.length)} قلم)</h4>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {o.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-3">
              <div className="w-12 shrink-0 rounded overflow-hidden"><ProductImage src={it.image} alt={it.name} ratio="3/4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">{it.name}</p>
                <p className="text-[10px] text-muted mt-0.5">
                  {it.size && `سایز ${it.size}`}{it.size && it.color && ' • '}{it.color}
                </p>
              </div>
              <span className="text-[11px] text-muted tabular shrink-0">{toFa(it.quantity)} × {toFa(group(Math.round(it.unitPrice / 10)))}</span>
              <span className="text-xs font-extrabold tabular shrink-0 w-28 text-left">{money(it.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="p-4 space-y-2 text-xs" style={{ background: 'var(--surface-2)' }}>
          <Line label="جمع کالاها" value={money(o.subtotal)} />
          {o.discountTotal > 0 && <Line label={`تخفیف${o.couponCode ? ` (${o.couponCode})` : ''}`} value={`− ${money(o.discountTotal)}`} tone="var(--danger)" />}
          <Line label="هزینه ارسال" value={o.shippingTotal ? money(o.shippingTotal) : 'رایگان'} />
          <Line label="مالیات بر ارزش افزوده" value={money(o.taxTotal)} />
          <div className="flex justify-between pt-2 mt-1 border-t border-line text-sm">
            <span className="font-extrabold">مبلغ نهایی</span>
            <span className="font-extrabold tabular">{money(o.grandTotal)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-muted">
            <span>بهای تمام‌شده کالاها</span>
            <span className="tabular">{money(o.costTotal)}</span>
          </div>
        </div>
      </div>

      {/* پرداخت‌ها */}
      <div className="rounded-theme border border-line p-4">
        <h4 className="text-xs font-extrabold mb-3 flex items-center gap-2"><Icons.wallet size={14} style={{ color: 'var(--primary)' }} /> تراکنش‌های پرداخت</h4>
        {o.payments.length === 0 ? (
          <p className="text-xs text-muted">تراکنشی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {o.payments.map((p) => {
              const st = PAY_STATUS[p.status] || { label: p.status, color: 'var(--text-muted)' };
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] py-2 px-3 rounded-theme" style={{ background: 'var(--surface-2)' }}>
                  <span className="badge" style={{ background: `color-mix(in srgb, ${st.color} 15%, transparent)`, color: st.color }}>{st.label}</span>
                  <span className="font-bold">{GW[p.gateway] || p.gateway}</span>
                  <span className="tabular">{money(p.amount)}</span>
                  {p.refId && <span className="tabular text-muted" dir="ltr">Ref: {p.refId}</span>}
                  {p.cardPan && <span className="tabular text-muted" dir="ltr">{p.cardPan}</span>}
                  {p.failReason && <span style={{ color: 'var(--danger)' }}>{p.failReason}</span>}
                  <span className="text-muted mr-auto">{faDate(p.createdAt, true)}</span>
                </div>
              );
            })}
          </div>
        )}
        {okPay && (
          <p className="text-[10px] mt-3 flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
            <Icons.shield size={12} /> پرداخت این سفارش سمت سرور تأیید شده است{okPay.verifiedAt ? ` — ${faDate(okPay.verifiedAt, true)}` : ''}.
          </p>
        )}
      </div>

      {/* یادداشت */}
      <div className="no-print">
        <label className="label">یادداشت داخلی (فقط برای مدیران)</label>
        <textarea className="input min-h-[70px] leading-7 text-xs" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: مشتری خواسته پیش از ارسال تماس گرفته شود." />
      </div>
    </div>
  );
}

const Box = ({ label, children }) => (
  <div className="rounded-theme p-3" style={{ background: 'var(--surface-2)' }}>
    <p className="text-[10px] text-muted mb-1.5">{label}</p>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3">
    <dt className="text-muted shrink-0">{label}</dt>
    <dd className="font-bold text-left">{children}</dd>
  </div>
);

const Line = ({ label, value, tone }) => (
  <div className="flex justify-between">
    <span className="text-muted">{label}</span>
    <span className="tabular font-bold" style={{ color: tone }}>{value}</span>
  </div>
);
