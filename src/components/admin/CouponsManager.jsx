'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, useToast } from '@/components/Providers';
import { Icons, Modal, Confirm, Spinner, Switch, CopyButton, money, toFa, group, faDate } from '@/components/ui';
import { ProgressBar } from '@/components/admin/AdminUI';

const STATE = {
  active: { label: 'فعال', color: 'var(--success)' },
  disabled: { label: 'غیرفعال', color: 'var(--text-muted)' },
  expired: { label: 'منقضی‌شده', color: 'var(--danger)' },
  scheduled: { label: 'زمان‌بندی‌شده', color: 'var(--accent)' },
  exhausted: { label: 'ظرفیت تمام', color: 'var(--warning)' },
};

const empty = () => ({
  id: null, code: '', type: 'PERCENT', value: 10,
  minSubtotalT: '', maxDiscountT: '', usageLimit: '', perUserLimit: 1,
  startsAt: '', endsAt: '', isActive: true, description: '',
});

const toT = (r) => (r == null || r === '' ? '' : String(Math.round(r / 10)));
const toR = (t) => Math.round(Number(t || 0) * 10);
const dstr = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

export default function CouponsManager({ items }) {
  const router = useRouter();
  const { push } = useToast();
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const openEdit = (c) => setEdit({
    id: c.id, code: c.code, type: c.type,
    value: c.type === 'PERCENT' ? c.value : Math.round(c.value / 10),
    minSubtotalT: toT(c.minSubtotal), maxDiscountT: toT(c.maxDiscount),
    usageLimit: c.usageLimit ?? '', perUserLimit: c.perUserLimit,
    startsAt: dstr(c.startsAt), endsAt: dstr(c.endsAt),
    isActive: c.isActive, description: c.description,
  });

  const save = async () => {
    const e = edit;
    if (!e.code.trim()) return push('کد تخفیف الزامی است.', 'error');
    if (!Number(e.value)) return push('مقدار تخفیف الزامی است.', 'error');
    if (e.type === 'PERCENT' && Number(e.value) > 100) return push('درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد.', 'error');
    setBusy(true);
    try {
      await apiFetch('/api/admin/coupons', {
        method: 'POST',
        body: {
          id: e.id || undefined,
          code: e.code.trim().toUpperCase(),
          type: e.type,
          value: e.type === 'PERCENT' ? Number(e.value) : toR(e.value),
          minSubtotal: e.minSubtotalT ? toR(e.minSubtotalT) : 0,
          maxDiscount: e.maxDiscountT ? toR(e.maxDiscountT) : null,
          usageLimit: e.usageLimit === '' ? null : Number(e.usageLimit),
          perUserLimit: Number(e.perUserLimit || 1),
          startsAt: e.startsAt || null,
          endsAt: e.endsAt || null,
          isActive: e.isActive,
          description: e.description.trim(),
        },
      });
      push(e.id ? 'کد تخفیف به‌روزرسانی شد.' : 'کد تخفیف جدید ساخته شد.', 'success');
      setEdit(null);
      router.refresh();
    } catch (err) { push(err.message, 'error'); } finally { setBusy(false); }
  };

  const toggle = async (c) => {
    try {
      await apiFetch('/api/admin/coupons', { method: 'PATCH', body: { id: c.id, isActive: !c.isActive } });
      router.refresh();
    } catch (e) { push(e.message, 'error'); }
  };

  const remove = async () => {
    const id = del; setDel(null);
    try {
      const res = await apiFetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
      push(res.message || 'کد تخفیف حذف شد.', res.archived ? 'info' : 'success');
      router.refresh();
    } catch (e) { push(e.message, 'error'); }
  };

  const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setEdit((e) => ({ ...e, code: s }));
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setEdit(empty())} className="btn btn-primary btn-sm"><Icons.plus size={15} /> کد تخفیف جدید</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Icons.ticket size={44} className="mx-auto text-muted mb-3" strokeWidth={1.2} />
          <p className="font-bold mb-1">هنوز کد تخفیفی نساخته‌اید</p>
          <p className="text-sm text-muted mb-4">با ساخت کمپین تخفیف، فروش خود را افزایش دهید.</p>
          <button onClick={() => setEdit(empty())} className="btn btn-primary btn-sm mx-auto"><Icons.plus size={15} /> ساخت اولین کد</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((c) => {
            const st = STATE[c.state];
            const roi = c.discountGiven ? (c.revenueGenerated / c.discountGiven) : 0;
            return (
              <article key={c.id} className="card p-4 flex flex-col" style={{ opacity: c.state === 'active' ? 1 : 0.7 }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold tabular tracking-wider" dir="ltr">{c.code}</h3>
                      <CopyButton text={c.code} />
                    </div>
                    {c.description && <p className="text-[11px] text-muted mt-1 line-clamp-1">{c.description}</p>}
                  </div>
                  <span className="badge shrink-0" style={{ background: `color-mix(in srgb, ${st.color} 15%, transparent)`, color: st.color }}>{st.label}</span>
                </div>

                <div className="rounded-theme p-3 mb-3 text-center" style={{ background: 'var(--primary-soft)' }}>
                  <p className="text-2xl font-extrabold tabular" style={{ color: 'var(--primary)' }}>
                    {c.type === 'PERCENT' ? `٪${toFa(c.value)}` : `${toFa(group(Math.round(c.value / 10)))}`}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">
                    {c.type === 'PERCENT' ? 'تخفیف درصدی' : 'تخفیف مبلغ ثابت (تومان)'}
                    {c.maxDiscount ? ` — سقف ${toFa(group(Math.round(c.maxDiscount / 10)))} ت` : ''}
                  </p>
                </div>

                <dl className="space-y-1.5 text-[11px] mb-3">
                  {c.minSubtotal > 0 && <Row label="حداقل خرید"><span className="tabular">{money(c.minSubtotal)}</span></Row>}
                  <Row label="محدودیت هر کاربر"><span className="tabular">{c.perUserLimit ? `${toFa(c.perUserLimit)} بار` : 'نامحدود'}</span></Row>
                  {(c.startsAt || c.endsAt) && (
                    <Row label="بازه اعتبار">
                      <span className="text-[10px]">{c.startsAt ? faDate(c.startsAt) : '—'} تا {c.endsAt ? faDate(c.endsAt) : 'بی‌نهایت'}</span>
                    </Row>
                  )}
                </dl>

                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-muted mb-1.5">
                    <span>مصرف‌شده</span>
                    <span className="tabular">{toFa(group(c.usedCount))} {c.usageLimit ? `از ${toFa(group(c.usageLimit))}` : '(نامحدود)'}</span>
                  </div>
                  <ProgressBar value={c.usedCount} max={c.usageLimit || Math.max(c.usedCount, 1)} showLabel={false} color={c.state === 'exhausted' ? 'var(--warning)' : 'var(--primary)'} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-2.5 border-y border-line mb-3">
                  <Mini label="سفارش" value={toFa(group(c.orders))} />
                  <Mini label="تخفیف" value={toFa(group(Math.round(c.discountGiven / 10)))} tone="var(--danger)" />
                  <Mini label="بازگشت" value={roi ? `${toFa(roi.toFixed(1))}×` : '—'} tone="var(--success)" />
                </div>

                <div className="mt-auto flex gap-1">
                  <button onClick={() => openEdit(c)} className="btn btn-ghost btn-sm flex-1 text-xs"><Icons.edit size={13} /> ویرایش</button>
                  <button onClick={() => toggle(c)} className="btn btn-ghost btn-sm text-xs" title={c.isActive ? 'غیرفعال کردن' : 'فعال کردن'}>
                    <Icons.eye size={13} style={{ color: c.isActive ? 'var(--success)' : undefined }} />
                  </button>
                  <button onClick={() => setDel(c.id)} className="btn btn-ghost btn-sm text-xs"><Icons.trash size={13} style={{ color: 'var(--danger)' }} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {edit && (
        <Modal
          open
          onClose={() => setEdit(null)}
          title={edit.id ? `ویرایش کد ${edit.code}` : 'ساخت کد تخفیف جدید'}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEdit(null)} className="btn btn-ghost">انصراف</button>
              <button onClick={save} disabled={busy} className="btn btn-primary">{busy ? <Spinner size={15} /> : <Icons.check size={15} />} ذخیره</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">کد تخفیف *</label>
              <div className="flex gap-2">
                <input
                  className="input tabular tracking-wider flex-1" dir="ltr"
                  value={edit.code}
                  onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                  placeholder="VESTO20" maxLength={24}
                />
                <button onClick={genCode} className="btn btn-soft" title="تولید کد تصادفی"><Icons.refresh size={15} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">نوع تخفیف</label>
                <select className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>
                  <option value="PERCENT">درصدی</option>
                  <option value="FIXED">مبلغ ثابت</option>
                </select>
              </div>
              <div>
                <label className="label">{edit.type === 'PERCENT' ? 'درصد تخفیف *' : 'مبلغ تخفیف (تومان) *'}</label>
                <input type="number" dir="ltr" className="input tabular" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} max={edit.type === 'PERCENT' ? 100 : undefined} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">حداقل مبلغ خرید (تومان)</label>
                <input type="number" dir="ltr" className="input tabular" value={edit.minSubtotalT} onChange={(e) => setEdit({ ...edit, minSubtotalT: e.target.value })} placeholder="بدون محدودیت" />
              </div>
              <div>
                <label className="label">سقف تخفیف (تومان)</label>
                <input
                  type="number" dir="ltr" className="input tabular"
                  value={edit.maxDiscountT} onChange={(e) => setEdit({ ...edit, maxDiscountT: e.target.value })}
                  placeholder={edit.type === 'PERCENT' ? 'مثلاً 500000' : 'کاربرد ندارد'}
                  disabled={edit.type === 'FIXED'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">ظرفیت کل استفاده</label>
                <input type="number" dir="ltr" className="input tabular" value={edit.usageLimit} onChange={(e) => setEdit({ ...edit, usageLimit: e.target.value })} placeholder="نامحدود" />
              </div>
              <div>
                <label className="label">حداکثر استفاده هر کاربر</label>
                <input type="number" dir="ltr" className="input tabular" value={edit.perUserLimit} onChange={(e) => setEdit({ ...edit, perUserLimit: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">شروع اعتبار</label>
                <input type="date" dir="ltr" className="input" value={edit.startsAt} onChange={(e) => setEdit({ ...edit, startsAt: e.target.value })} />
              </div>
              <div>
                <label className="label">پایان اعتبار</label>
                <input type="date" dir="ltr" className="input" value={edit.endsAt} onChange={(e) => setEdit({ ...edit, endsAt: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">توضیح کمپین (داخلی)</label>
              <input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="کمپین پاییزه اینستاگرام" maxLength={200} />
            </div>

            <div className="pt-2 border-t border-line">
              <Switch checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="کد فعال باشد" hint="در صورت غیرفعال بودن، مشتری نمی‌تواند از آن استفاده کند." />
            </div>
          </div>
        </Modal>
      )}

      <Confirm
        open={!!del}
        title="حذف کد تخفیف"
        message="اگر این کد در سفارشی استفاده شده باشد، به‌جای حذف فقط غیرفعال می‌شود. ادامه می‌دهید؟"
        onCancel={() => setDel(null)}
        onConfirm={remove}
        confirmText="حذف"
      />
    </>
  );
}

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-muted">{label}</dt>
    <dd className="font-bold">{children}</dd>
  </div>
);

const Mini = ({ label, value, tone }) => (
  <div>
    <p className="text-[9px] text-muted mb-0.5">{label}</p>
    <p className="text-xs font-extrabold tabular" style={{ color: tone }}>{value}</p>
  </div>
);
