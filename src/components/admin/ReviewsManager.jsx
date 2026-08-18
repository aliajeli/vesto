'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, useToast } from '@/components/Providers';
import { Icons, Confirm, Spinner, Rating, ProductImage, toFa, faDate } from '@/components/ui';

export default function ReviewsManager({ items, filter, pendingCount, approvedCount }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { push } = useToast();

  const [busy, setBusy] = useState(null);
  const [del, setDel] = useState(null);
  const [selected, setSelected] = useState([]);

  const nav = (f) => {
    const p = new URLSearchParams(sp.toString());
    p.set('filter', f);
    router.push(`${pathname}?${p}`);
    setSelected([]);
  };

  const act = async (id, isApproved) => {
    setBusy(id);
    try {
      await apiFetch('/api/admin/reviews', { method: 'PATCH', body: { id, isApproved } });
      push(isApproved ? 'نظر تأیید و منتشر شد.' : 'نظر از انتشار خارج شد.', 'success');
      router.refresh();
    } catch (e) { push(e.message, 'error'); } finally { setBusy(null); }
  };

  const bulk = async (isApproved) => {
    if (!selected.length) return;
    setBusy('bulk');
    try {
      const res = await apiFetch('/api/admin/reviews', { method: 'PATCH', body: { ids: selected, isApproved } });
      push(`${toFa(res.count)} نظر ${isApproved ? 'تأیید' : 'رد'} شد.`, 'success');
      setSelected([]);
      router.refresh();
    } catch (e) { push(e.message, 'error'); } finally { setBusy(null); }
  };

  const remove = async () => {
    const id = del; setDel(null);
    try {
      await apiFetch(`/api/admin/reviews?id=${id}`, { method: 'DELETE' });
      push('نظر حذف شد.', 'success');
      router.refresh();
    } catch (e) { push(e.message, 'error'); }
  };

  const tabs = [
    { id: 'pending', label: 'در انتظار تأیید', n: pendingCount },
    { id: 'approved', label: 'تأییدشده', n: approvedCount },
    { id: 'all', label: 'همه', n: pendingCount + approvedCount },
  ];

  const toggleSel = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <div className="card p-3 md:p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-theme" style={{ background: 'var(--surface-2)' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => nav(t.id)}
              className="px-3.5 py-2 rounded-[calc(var(--radius)*0.5)] text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5"
              style={filter === t.id ? { background: 'var(--primary)', color: 'var(--primary-contrast)' } : { color: 'var(--text-muted)' }}
            >
              {t.label}<span className="tabular opacity-70">{toFa(t.n)}</span>
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-[11px] text-muted tabular">{toFa(selected.length)} مورد انتخاب شده</span>
            <button onClick={() => bulk(true)} disabled={busy === 'bulk'} className="btn btn-sm" style={{ background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)' }}>
              {busy === 'bulk' ? <Spinner size={13} /> : <Icons.check size={13} />} تأیید همه
            </button>
            <button onClick={() => bulk(false)} disabled={busy === 'bulk'} className="btn btn-sm" style={{ background: 'color-mix(in srgb, var(--danger) 16%, transparent)', color: 'var(--danger)' }}>
              <Icons.close size={13} /> رد همه
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Icons.star size={44} className="mx-auto text-muted mb-3" strokeWidth={1.2} />
          <p className="font-bold">نظری در این دسته وجود ندارد</p>
          {filter === 'pending' && <p className="text-sm text-muted mt-1">تمام نظرات بررسی شده‌اند. 👌</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <article key={r.id} className="card p-4" style={{ borderInlineStartWidth: 3, borderInlineStartColor: r.isApproved ? 'var(--success)' : 'var(--warning)' }}>
              <div className="flex gap-3">
                {!r.isApproved && (
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggleSel(r.id)}
                    className="mt-1.5 w-4 h-4 shrink-0 cursor-pointer accent-[var(--primary)]"
                    aria-label="انتخاب نظر"
                  />
                )}

                <Link href={`/product/${r.productSlug}`} target="_blank" className="w-14 shrink-0 rounded-theme overflow-hidden">
                  <ProductImage src={r.productImage} alt={r.productName} ratio="3/4" />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold truncate">{r.productName}</p>
                      <p className="text-[10px] text-muted mt-0.5">
                        امتیاز فعلی محصول: ★ {toFa(r.productRating)} از {toFa(r.productReviewCount)} نظر
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Rating value={r.rating} showCount={false} size={13} />
                      <span className="badge" style={{
                        background: r.isApproved ? 'color-mix(in srgb, var(--success) 14%, transparent)' : 'color-mix(in srgb, var(--warning) 14%, transparent)',
                        color: r.isApproved ? 'var(--success)' : 'var(--warning)',
                      }}>{r.isApproved ? 'منتشرشده' : 'در انتظار'}</span>
                    </div>
                  </div>

                  {r.title && <p className="text-sm font-bold mb-1">{r.title}</p>}
                  <p className="text-[13px] leading-7 text-muted">{r.body}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[10px] text-muted">
                    <span className="flex items-center gap-1"><Icons.user size={11} /> {r.userName}</span>
                    {r.userEmail && <span className="tabular" dir="ltr">{r.userEmail}</span>}
                    <span className="flex items-center gap-1"><Icons.clock size={11} /> {faDate(r.createdAt, true)}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-1.5 shrink-0">
                  {!r.isApproved ? (
                    <button onClick={() => act(r.id, true)} disabled={busy === r.id} className="btn btn-sm" style={{ background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)' }}>
                      {busy === r.id ? <Spinner size={13} /> : <Icons.check size={13} />} تأیید
                    </button>
                  ) : (
                    <button onClick={() => act(r.id, false)} disabled={busy === r.id} className="btn btn-ghost btn-sm text-xs">
                      {busy === r.id ? <Spinner size={13} /> : <Icons.eye size={13} />} لغو انتشار
                    </button>
                  )}
                  <button onClick={() => setDel(r.id)} className="btn btn-ghost btn-sm text-xs">
                    <Icons.trash size={13} style={{ color: 'var(--danger)' }} /> حذف
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Confirm
        open={!!del}
        title="حذف نظر"
        message="این نظر برای همیشه حذف می‌شود و امتیاز محصول مجدداً محاسبه خواهد شد. مطمئن هستید؟"
        onCancel={() => setDel(null)}
        onConfirm={remove}
        confirmText="حذف نظر"
      />
    </>
  );
}
