'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, useToast } from '@/components/Providers';
import { Icons, Modal, Confirm, Spinner, Switch, Tabs, ProductImage, money, toFa, group } from '@/components/ui';

const FILTERS = [
  { id: 'all', label: 'همه' },
  { id: 'active', label: 'فعال' },
  { id: 'inactive', label: 'غیرفعال' },
  { id: 'featured', label: 'ویژه' },
  { id: 'sale', label: 'تخفیف‌دار' },
];

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '38', '40', '42', '44'];
const COLOR_PRESETS = [
  { name: 'مشکی', hex: '#111111' }, { name: 'سفید', hex: '#f8f8f8' }, { name: 'سرمه‌ای', hex: '#1e293b' },
  { name: 'خاکستری', hex: '#6b7280' }, { name: 'بژ', hex: '#d6c3a5' }, { name: 'زیتونی', hex: '#556b2f' },
  { name: 'قهوه‌ای', hex: '#6b4423' }, { name: 'کرم', hex: '#f0e6d2' }, { name: 'آبی', hex: '#2563eb' },
  { name: 'قرمز', hex: '#dc2626' }, { name: 'صورتی', hex: '#ec4899' }, { name: 'سبز', hex: '#16a34a' },
];

const empty = () => ({
  id: null, name: '', slug: '', shortDesc: '', description: '',
  priceT: '', compareAtPriceT: '', costPriceT: '', sku: '', barcode: '',
  categoryId: '', brandId: '', images: [], tags: [],
  material: '', careGuide: '', origin: 'ایران', weightGram: '',
  isActive: true, isFeatured: false, isNew: true,
  seoTitle: '', seoDescription: '',
  variants: [],
});

const toT = (rial) => (rial == null || rial === '' ? '' : String(Math.round(rial / 10)));
const toR = (t) => Math.round(Number(t || 0) * 10);

export default function ProductsManager({ items, total, page, pages, q, filter, categories, brands }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { push } = useToast();

  const [search, setSearch] = useState(q || '');
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('basic');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toggling, setToggling] = useState(null);

  const nav = useCallback((patch) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v == null) p.delete(k); else p.set(k, v); });
    if (!('page' in patch)) p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, sp]);

  const openNew = () => { setEditing(empty()); setTab('basic'); };
  const openEdit = (p) => {
    setEditing({
      id: p.id, name: p.name, slug: p.slug, shortDesc: p.shortDesc || '', description: p.description || '',
      priceT: toT(p.price), compareAtPriceT: toT(p.compareAtPrice), costPriceT: toT(p.costPrice),
      sku: p.sku || '', barcode: p.barcode || '', categoryId: p.categoryId || '', brandId: p.brandId || '',
      images: p.images || [], tags: p.tags || [],
      material: p.material || '', careGuide: p.careGuide || '', origin: p.origin || '',
      weightGram: p.weightGram ?? '', isActive: p.isActive, isFeatured: p.isFeatured, isNew: p.isNew,
      seoTitle: p.seoTitle || '', seoDescription: p.seoDescription || '',
      variants: (p.variants || []).map((v) => ({ ...v, priceDiffT: toT(v.priceDiff) || '0' })),
    });
    setTab('basic');
  };

  const set = (patch) => setEditing((e) => ({ ...e, ...patch }));

  const save = async () => {
    const e = editing;
    if (!e.name.trim()) return push('نام محصول الزامی است.', 'error');
    if (!Number(e.priceT)) return push('قیمت محصول الزامی است.', 'error');
    if (!e.variants.length) return push('حداقل یک تنوع (سایز و رنگ) اضافه کنید.', 'error');

    setBusy(true);
    try {
      await apiFetch('/api/admin/products', {
        method: 'POST',
        body: {
          id: e.id || undefined,
          name: e.name.trim(), slug: e.slug.trim(), shortDesc: e.shortDesc.trim(), description: e.description.trim(),
          price: toR(e.priceT),
          compareAtPrice: e.compareAtPriceT ? toR(e.compareAtPriceT) : null,
          costPrice: e.costPriceT ? toR(e.costPriceT) : null,
          sku: e.sku.trim() || null, barcode: e.barcode.trim() || null,
          categoryId: e.categoryId || null, brandId: e.brandId || null,
          images: e.images.filter(Boolean), tags: e.tags.filter(Boolean),
          material: e.material.trim() || null, careGuide: e.careGuide.trim() || null,
          origin: e.origin.trim() || null,
          weightGram: e.weightGram === '' ? null : Number(e.weightGram),
          isActive: e.isActive, isFeatured: e.isFeatured, isNew: e.isNew,
          seoTitle: e.seoTitle.trim() || null, seoDescription: e.seoDescription.trim() || null,
          variants: e.variants.map((v) => ({
            size: v.size, color: v.color, colorHex: v.colorHex || '#000000',
            stock: Number(v.stock || 0), priceDiff: toR(v.priceDiffT || 0), sku: v.sku || null,
          })),
        },
      });
      push(e.id ? 'محصول به‌روزرسانی شد.' : 'محصول جدید ثبت شد.', 'success');
      setEditing(null);
      router.refresh();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p, field) => {
    setToggling(`${p.id}:${field}`);
    try {
      await apiFetch('/api/admin/products', { method: 'PATCH', body: { id: p.id, field, value: !p[field] } });
      router.refresh();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setToggling(null);
    }
  };

  const remove = async () => {
    const id = confirmDel;
    setConfirmDel(null);
    try {
      const res = await apiFetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      push(res.message || 'محصول حذف شد.', res.archived ? 'info' : 'success');
      router.refresh();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  return (
    <>
      {/* نوار ابزار */}
      <div className="card p-3 md:p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <form
            onSubmit={(ev) => { ev.preventDefault(); nav({ q: search }); }}
            className="relative flex-1 min-w-[220px]"
          >
            <Icons.search size={16} className="absolute top-1/2 -translate-y-1/2 text-muted" style={{ insetInlineStart: 12 }} />
            <input
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder="جستجو بر اساس نام، SKU یا اسلاگ…"
              className="input"
              style={{ paddingInlineStart: 38 }}
            />
          </form>
          <Tabs tabs={FILTERS} active={filter} onChange={(id) => nav({ filter: id === 'all' ? '' : id })} />
          <button onClick={openNew} className="btn btn-primary btn-sm">
            <Icons.plus size={15} /> محصول جدید
          </button>
        </div>
      </div>

      {/* گرید محصولات */}
      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Icons.package size={44} className="mx-auto text-muted mb-3" strokeWidth={1.2} />
          <p className="font-bold mb-1">محصولی یافت نشد</p>
          <p className="text-sm text-muted mb-4">فیلترها را تغییر دهید یا محصول جدیدی اضافه کنید.</p>
          <button onClick={openNew} className="btn btn-primary btn-sm mx-auto"><Icons.plus size={15} /> افزودن محصول</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => {
            const off = p.compareAtPrice && p.compareAtPrice > p.price
              ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0;
            const margin = p.costPrice ? Math.round(((p.price - p.costPrice) / p.price) * 100) : null;
            return (
              <article key={p.id} className="card overflow-hidden flex flex-col" style={{ opacity: p.isActive ? 1 : 0.55 }}>
                <div className="flex gap-3 p-3">
                  <div className="w-24 shrink-0 rounded-theme overflow-hidden">
                    <ProductImage src={p.images[0]} alt={p.name} ratio="3/4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 justify-between">
                      <h3 className="text-sm font-extrabold leading-6 line-clamp-2">{p.name}</h3>
                      <div className="flex gap-1 shrink-0">
                        {p.isFeatured && <span title="ویژه"><Icons.sparkle size={14} style={{ color: 'var(--primary)' }} /></span>}
                        {p.isNew && <span title="جدید"><Icons.tag size={14} style={{ color: 'var(--accent)' }} /></span>}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted mt-1">
                      {p.categoryName || 'بدون دسته'}{p.brandName ? ` • ${p.brandName}` : ''}
                    </p>
                    <div className="flex items-baseline gap-2 mt-2 flex-wrap">
                      <span className="text-sm font-extrabold tabular">{money(p.price)}</span>
                      {off > 0 && (
                        <>
                          <span className="text-[11px] text-muted line-through tabular">{toFa(group(Math.round(p.compareAtPrice / 10)))}</span>
                          <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}>٪{toFa(off)}−</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-muted">
                      <span className="tabular">موجودی: <b style={{ color: p.stock === 0 ? 'var(--danger)' : p.stock < 10 ? 'var(--warning)' : 'var(--success)' }}>{toFa(group(p.stock))}</b></span>
                      <span className="tabular">فروش: {toFa(group(p.soldCount))}</span>
                      {margin != null && <span className="tabular">حاشیه: ٪{toFa(margin)}</span>}
                      {p.ratingCount > 0 && <span className="tabular">★ {toFa(p.ratingAvg.toFixed(1))}</span>}
                    </div>
                    {/* تنوع‌ها */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.variants.slice(0, 6).map((v) => (
                        <span
                          key={v.id}
                          title={`${v.size} / ${v.color} — ${v.stock} عدد`}
                          className="w-4 h-4 rounded-full border"
                          style={{ background: v.colorHex, borderColor: 'var(--border)', opacity: v.stock ? 1 : 0.3 }}
                        />
                      ))}
                      {p.variants.length > 6 && <span className="text-[10px] text-muted">+{toFa(p.variants.length - 6)}</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-1 border-t border-line px-2 py-2">
                  <button onClick={() => openEdit(p)} className="btn btn-ghost btn-sm flex-1 text-xs"><Icons.edit size={13} /> ویرایش</button>
                  <button
                    onClick={() => toggle(p, 'isActive')}
                    disabled={toggling === `${p.id}:isActive`}
                    className="btn btn-ghost btn-sm text-xs"
                    title={p.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                  >
                    {toggling === `${p.id}:isActive` ? <Spinner size={13} /> : <Icons.eye size={13} />}
                  </button>
                  <button onClick={() => toggle(p, 'isFeatured')} className="btn btn-ghost btn-sm text-xs" title="محصول ویژه">
                    <Icons.sparkle size={13} style={{ color: p.isFeatured ? 'var(--primary)' : undefined }} />
                  </button>
                  <Link href={`/product/${p.slug}`} target="_blank" className="btn btn-ghost btn-sm text-xs" title="مشاهده در سایت">
                    <Icons.arrowLeft size={13} />
                  </Link>
                  <button onClick={() => setConfirmDel(p.id)} className="btn btn-ghost btn-sm text-xs" title="حذف">
                    <Icons.trash size={13} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* صفحه‌بندی */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => nav({ page: page - 1 })} className="btn btn-soft btn-sm">
            <Icons.chevronRight size={15} /> قبلی
          </button>
          <span className="text-xs text-muted tabular px-3">صفحه {toFa(page)} از {toFa(pages)} — {toFa(group(total))} محصول</span>
          <button disabled={page >= pages} onClick={() => nav({ page: page + 1 })} className="btn btn-soft btn-sm">
            بعدی <Icons.chevronLeft size={15} />
          </button>
        </div>
      )}

      {/* ویرایشگر */}
      {editing && (
        <Modal
          open
          wide
          onClose={() => setEditing(null)}
          title={editing.id ? `ویرایش: ${editing.name}` : 'افزودن محصول جدید'}
          footer={
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted">
                {editing.variants.length > 0 && `${toFa(editing.variants.length)} تنوع • ${toFa(group(editing.variants.reduce((s, v) => s + Number(v.stock || 0), 0)))} عدد موجودی`}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="btn btn-ghost">انصراف</button>
                <button onClick={save} disabled={busy} className="btn btn-primary">
                  {busy ? <Spinner size={15} /> : <Icons.check size={15} />} ذخیره محصول
                </button>
              </div>
            </div>
          }
        >
          <Tabs
            className="mb-5"
            tabs={[
              { id: 'basic', label: 'اطلاعات پایه' },
              { id: 'media', label: 'تصاویر' },
              { id: 'variants', label: `تنوع‌ها (${toFa(editing.variants.length)})` },
              { id: 'details', label: 'جزئیات' },
              { id: 'seo', label: 'سئو' },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'basic' && <BasicTab e={editing} set={set} categories={categories} brands={brands} />}
          {tab === 'media' && <MediaTab e={editing} set={set} />}
          {tab === 'variants' && <VariantsTab e={editing} set={set} />}
          {tab === 'details' && <DetailsTab e={editing} set={set} />}
          {tab === 'seo' && <SeoTab e={editing} set={set} />}
        </Modal>
      )}

      <Confirm
        open={!!confirmDel}
        title="حذف محصول"
        message="اگر این محصول در سفارشی استفاده شده باشد، به‌جای حذف فقط غیرفعال می‌شود تا تاریخچه‌ی مالی حفظ بماند. ادامه می‌دهید؟"
        onCancel={() => setConfirmDel(null)}
        onConfirm={remove}
        confirmText="حذف محصول"
      />
    </>
  );
}

/* ---------------------------------------------------------------- تب‌ها */

function BasicTab({ e, set, categories, brands }) {
  const price = Number(e.priceT || 0);
  const cost = Number(e.costPriceT || 0);
  const margin = price && cost ? Math.round(((price - cost) / price) * 100) : null;

  return (
    <div className="space-y-4">
      <div>
        <label className="label">نام محصول *</label>
        <input className="input" value={e.name} onChange={(ev) => set({ name: ev.target.value })} placeholder="پیراهن آستین بلند کتان" />
      </div>
      <div>
        <label className="label">توضیح کوتاه</label>
        <input className="input" value={e.shortDesc} onChange={(ev) => set({ shortDesc: ev.target.value })} placeholder="یک جمله جذاب برای کارت محصول" maxLength={300} />
      </div>
      <div>
        <label className="label">توضیحات کامل</label>
        <textarea className="input min-h-[120px] leading-7" value={e.description} onChange={(ev) => set({ description: ev.target.value })} placeholder="جنس، فیت، مشخصات دوخت و…" />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label">قیمت فروش (تومان) *</label>
          <input type="number" dir="ltr" className="input tabular" value={e.priceT} onChange={(ev) => set({ priceT: ev.target.value })} placeholder="1850000" />
        </div>
        <div>
          <label className="label">قیمت قبل از تخفیف</label>
          <input type="number" dir="ltr" className="input tabular" value={e.compareAtPriceT} onChange={(ev) => set({ compareAtPriceT: ev.target.value })} placeholder="2400000" />
        </div>
        <div>
          <label className="label">بهای تمام‌شده (خرید)</label>
          <input type="number" dir="ltr" className="input tabular" value={e.costPriceT} onChange={(ev) => set({ costPriceT: ev.target.value })} placeholder="1100000" />
        </div>
      </div>

      {margin != null && (
        <div className="rounded-theme p-3 text-xs flex items-center gap-2" style={{ background: 'var(--primary-soft)' }}>
          <Icons.chart size={15} style={{ color: 'var(--primary)' }} />
          حاشیه سود این محصول: <b className="tabular">٪{toFa(margin)}</b>
          <span className="text-muted">— سود هر فروش: <b className="tabular">{toFa(group(price - cost))} تومان</b></span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">دسته‌بندی</label>
          <select className="input" value={e.categoryId} onChange={(ev) => set({ categoryId: ev.target.value })}>
            <option value="">— انتخاب کنید —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">برند</label>
          <select className="input" value={e.brandId} onChange={(ev) => set({ brandId: ev.target.value })}>
            <option value="">— بدون برند —</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label">کد کالا (SKU)</label>
          <input className="input tabular" dir="ltr" value={e.sku} onChange={(ev) => set({ sku: ev.target.value })} placeholder="VS-1050" />
        </div>
        <div>
          <label className="label">بارکد</label>
          <input className="input tabular" dir="ltr" value={e.barcode} onChange={(ev) => set({ barcode: ev.target.value })} />
        </div>
        <div>
          <label className="label">اسلاگ (آدرس)</label>
          <input className="input tabular" dir="ltr" value={e.slug} onChange={(ev) => set({ slug: ev.target.value })} placeholder="خودکار از نام" />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-line">
        <Switch checked={e.isActive} onChange={(v) => set({ isActive: v })} label="فعال در سایت" hint="نمایش در فروشگاه" />
        <Switch checked={e.isFeatured} onChange={(v) => set({ isFeatured: v })} label="محصول ویژه" hint="نمایش در صفحه اصلی" />
        <Switch checked={e.isNew} onChange={(v) => set({ isNew: v })} label="محصول جدید" hint="نشان «جدید»" />
      </div>
    </div>
  );
}

function MediaTab({ e, set }) {
  const [url, setUrl] = useState('');
  const add = () => {
    const u = url.trim();
    if (!u) return;
    if (e.images.length >= 10) return;
    set({ images: [...e.images, u] });
    setUrl('');
  };
  const onFile = (files) => {
    const list = [...files].slice(0, 10 - e.images.length);
    list.forEach((f) => {
      if (f.size > 2_000_000) return;
      const r = new FileReader();
      r.onload = () => set({ images: [...(e.images || []), r.result] });
      r.readAsDataURL(f);
    });
  };
  const move = (i, dir) => {
    const arr = [...e.images];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ images: arr });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-theme border-2 border-dashed p-6 text-center" style={{ borderColor: 'var(--border)' }}>
        <Icons.download size={26} className="mx-auto text-muted mb-2" />
        <p className="text-sm font-bold mb-1">بارگذاری تصویر از دستگاه</p>
        <p className="text-[11px] text-muted mb-3">حداکثر ۱۰ تصویر، هر کدام تا ۲ مگابایت (jpg, png, webp)</p>
        <label className="btn btn-soft btn-sm mx-auto cursor-pointer w-fit">
          <Icons.plus size={14} /> انتخاب فایل
          <input type="file" accept="image/*" multiple hidden onChange={(ev) => onFile(ev.target.files)} />
        </label>
      </div>

      <div className="flex gap-2">
        <input className="input flex-1" dir="ltr" value={url} onChange={(ev) => setUrl(ev.target.value)} placeholder="یا آدرس تصویر را وارد کنید: https://…" onKeyDown={(ev) => ev.key === 'Enter' && (ev.preventDefault(), add())} />
        <button onClick={add} className="btn btn-soft"><Icons.plus size={15} /> افزودن</button>
      </div>

      {e.images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {e.images.map((src, i) => (
            <div key={i} className="relative group rounded-theme overflow-hidden border border-line">
              <ProductImage src={src} alt="" ratio="3/4" />
              {i === 0 && <span className="absolute top-1.5 badge text-[9px]" style={{ insetInlineStart: 6, background: 'var(--primary)', color: 'var(--primary-contrast)' }}>اصلی</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => move(i, -1)} className="text-white/90 hover:text-white" title="جابه‌جایی"><Icons.chevronRight size={14} /></button>
                <button onClick={() => set({ images: e.images.filter((_, k) => k !== i) })} className="text-red-300 hover:text-red-200" title="حذف"><Icons.trash size={14} /></button>
                <button onClick={() => move(i, 1)} className="text-white/90 hover:text-white" title="جابه‌جایی"><Icons.chevronLeft size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantsTab({ e, set }) {
  const [size, setSize] = useState('M');
  const [color, setColor] = useState(COLOR_PRESETS[0].name);
  const [hex, setHex] = useState(COLOR_PRESETS[0].hex);
  const [stock, setStock] = useState('10');

  const add = () => {
    if (!size.trim() || !color.trim()) return;
    const key = `${size.trim()}|${color.trim()}`;
    if (e.variants.some((v) => `${v.size}|${v.color}` === key)) return;
    set({ variants: [...e.variants, { size: size.trim(), color: color.trim(), colorHex: hex, stock: Number(stock || 0), priceDiffT: '0', sku: '' }] });
  };

  const bulk = () => {
    const sizes = ['S', 'M', 'L', 'XL'];
    const next = [...e.variants];
    for (const s of sizes) {
      const key = `${s}|${color}`;
      if (next.some((v) => `${v.size}|${v.color}` === key)) continue;
      next.push({ size: s, color, colorHex: hex, stock: Number(stock || 0), priceDiffT: '0', sku: '' });
    }
    set({ variants: next });
  };

  const upd = (i, patch) => set({ variants: e.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)) });

  return (
    <div className="space-y-4">
      <div className="rounded-theme p-4" style={{ background: 'var(--surface-2)' }}>
        <p className="text-xs font-extrabold mb-3">افزودن تنوع جدید</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end">
          <div>
            <label className="label text-[10px]">سایز</label>
            <input list="size-presets" className="input h-10 text-sm" value={size} onChange={(ev) => setSize(ev.target.value)} />
            <datalist id="size-presets">{SIZE_PRESETS.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label className="label text-[10px]">رنگ</label>
            <input list="color-presets" className="input h-10 text-sm" value={color} onChange={(ev) => {
              setColor(ev.target.value);
              const f = COLOR_PRESETS.find((c) => c.name === ev.target.value);
              if (f) setHex(f.hex);
            }} />
            <datalist id="color-presets">{COLOR_PRESETS.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          </div>
          <div>
            <label className="label text-[10px]">کد رنگ</label>
            <input type="color" className="input h-10 p-1 cursor-pointer" value={hex} onChange={(ev) => setHex(ev.target.value)} />
          </div>
          <div>
            <label className="label text-[10px]">موجودی</label>
            <input type="number" dir="ltr" className="input h-10 text-sm tabular" value={stock} onChange={(ev) => setStock(ev.target.value)} />
          </div>
          <div className="flex gap-1.5">
            <button onClick={add} className="btn btn-primary btn-sm flex-1"><Icons.plus size={14} /> افزودن</button>
            <button onClick={bulk} className="btn btn-soft btn-sm" title="افزودن S تا XL برای این رنگ">S–XL</button>
          </div>
        </div>
      </div>

      {e.variants.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">هنوز تنوعی اضافه نشده. حداقل یک ترکیب سایز و رنگ لازم است.</p>
      ) : (
        <div className="scroll-x">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="border-b border-line">
                {['رنگ', 'سایز', 'موجودی', 'اختلاف قیمت (تومان)', 'SKU', ''].map((h, i) => (
                  <th key={i} className="text-right text-[10px] font-extrabold text-muted pb-2 px-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {e.variants.map((v, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={v.colorHex} onChange={(ev) => upd(i, { colorHex: ev.target.value })} className="w-7 h-7 rounded border-0 p-0 cursor-pointer bg-transparent" />
                      <input className="input h-8 text-xs w-24" value={v.color} onChange={(ev) => upd(i, { color: ev.target.value })} />
                    </div>
                  </td>
                  <td className="py-2 px-2"><input className="input h-8 text-xs w-16 tabular" value={v.size} onChange={(ev) => upd(i, { size: ev.target.value })} /></td>
                  <td className="py-2 px-2">
                    <input
                      type="number" dir="ltr" className="input h-8 text-xs w-20 tabular"
                      value={v.stock}
                      onChange={(ev) => upd(i, { stock: ev.target.value })}
                      style={{ color: Number(v.stock) === 0 ? 'var(--danger)' : undefined }}
                    />
                  </td>
                  <td className="py-2 px-2"><input type="number" dir="ltr" className="input h-8 text-xs w-28 tabular" value={v.priceDiffT} onChange={(ev) => upd(i, { priceDiffT: ev.target.value })} placeholder="0" /></td>
                  <td className="py-2 px-2"><input className="input h-8 text-xs w-28 tabular" dir="ltr" value={v.sku || ''} onChange={(ev) => upd(i, { sku: ev.target.value })} /></td>
                  <td className="py-2 px-2 text-left">
                    <button onClick={() => set({ variants: e.variants.filter((_, k) => k !== i) })} className="text-muted hover:text-[var(--danger)]"><Icons.trash size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DetailsTab({ e, set }) {
  const [tag, setTag] = useState('');
  const addTag = () => {
    const t = tag.trim();
    if (!t || e.tags.includes(t) || e.tags.length >= 15) return;
    set({ tags: [...e.tags, t] });
    setTag('');
  };
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">جنس پارچه</label>
          <input className="input" value={e.material} onChange={(ev) => set({ material: ev.target.value })} placeholder="۱۰۰٪ کتان" />
        </div>
        <div>
          <label className="label">کشور سازنده</label>
          <input className="input" value={e.origin} onChange={(ev) => set({ origin: ev.target.value })} placeholder="ایران" />
        </div>
      </div>
      <div>
        <label className="label">راهنمای نگهداری</label>
        <textarea className="input min-h-[80px] leading-7" value={e.careGuide} onChange={(ev) => set({ careGuide: ev.target.value })} placeholder="شست‌وشو با آب سرد، خشک‌شویی توصیه نمی‌شود…" />
      </div>
      <div>
        <label className="label">وزن (گرم)</label>
        <input type="number" dir="ltr" className="input tabular max-w-[200px]" value={e.weightGram} onChange={(ev) => set({ weightGram: ev.target.value })} placeholder="450" />
      </div>
      <div>
        <label className="label">برچسب‌ها</label>
        <div className="flex gap-2 mb-2">
          <input className="input flex-1" value={tag} onChange={(ev) => setTag(ev.target.value)} onKeyDown={(ev) => ev.key === 'Enter' && (ev.preventDefault(), addTag())} placeholder="مثلاً: پاییزی، کژوال" />
          <button onClick={addTag} className="btn btn-soft"><Icons.plus size={15} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {e.tags.map((t) => (
            <span key={t} className="badge flex items-center gap-1.5" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              {t}
              <button onClick={() => set({ tags: e.tags.filter((x) => x !== t) })} className="hover:text-[var(--danger)]"><Icons.close size={11} /></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeoTab({ e, set }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label">عنوان سئو</label>
        <input className="input" value={e.seoTitle} onChange={(ev) => set({ seoTitle: ev.target.value })} placeholder={e.name} maxLength={160} />
        <p className="text-[10px] text-muted mt-1">{toFa((e.seoTitle || '').length)} از ۱۶۰ نویسه</p>
      </div>
      <div>
        <label className="label">توضیحات متا</label>
        <textarea className="input min-h-[90px] leading-7" value={e.seoDescription} onChange={(ev) => set({ seoDescription: ev.target.value })} placeholder={e.shortDesc} maxLength={300} />
        <p className="text-[10px] text-muted mt-1">{toFa((e.seoDescription || '').length)} از ۳۰۰ نویسه</p>
      </div>
      <div className="rounded-theme p-4 border border-line">
        <p className="text-[10px] text-muted mb-2">پیش‌نمایش در گوگل:</p>
        <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{e.seoTitle || e.name || 'عنوان محصول'}</p>
        <p className="text-[11px] tabular mt-0.5" style={{ color: 'var(--success)' }} dir="ltr">vesto.ir/product/{e.slug || '...'}</p>
        <p className="text-xs text-muted mt-1 leading-6">{e.seoDescription || e.shortDesc || 'توضیحات محصول در نتایج جستجو اینجا نمایش داده می‌شود.'}</p>
      </div>
    </div>
  );
}
