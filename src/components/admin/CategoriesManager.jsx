'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, useToast } from '@/components/Providers';
import { Icons, Modal, Confirm, Spinner, Switch, ProductImage, toFa, group } from '@/components/ui';

const ICON_CHOICES = ['package', 'tag', 'grid', 'layers', 'box', 'sparkle', 'star', 'heart', 'shield', 'truck'];

const emptyCat = () => ({ id: null, name: '', slug: '', description: '', image: '', icon: 'package', parentId: '', sortOrder: 0, isActive: true });
const emptyBrand = () => ({ id: null, name: '', slug: '', logo: '' });

export default function CategoriesManager({ categories, brands }) {
  const router = useRouter();
  const { push } = useToast();
  const [cat, setCat] = useState(null);
  const [brand, setBrand] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null); // {kind, id, name}

  const tree = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId);
    const byParent = new Map();
    categories.filter((c) => c.parentId).forEach((c) => {
      if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
      byParent.get(c.parentId).push(c);
    });
    return roots.map((r) => ({ ...r, children: byParent.get(r.id) || [] }));
  }, [categories]);

  const saveCat = async () => {
    if (!cat.name.trim()) return push('نام دسته‌بندی الزامی است.', 'error');
    setBusy(true);
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: {
          kind: 'category',
          data: {
            id: cat.id || undefined, name: cat.name.trim(), slug: cat.slug.trim(),
            description: cat.description.trim(), image: cat.image, icon: cat.icon,
            parentId: cat.parentId || null, sortOrder: Number(cat.sortOrder || 0), isActive: cat.isActive,
          },
        },
      });
      push(cat.id ? 'دسته‌بندی به‌روزرسانی شد.' : 'دسته‌بندی جدید ثبت شد.', 'success');
      setCat(null);
      router.refresh();
    } catch (e) { push(e.message, 'error'); } finally { setBusy(false); }
  };

  const saveBrand = async () => {
    if (!brand.name.trim()) return push('نام برند الزامی است.', 'error');
    setBusy(true);
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: { kind: 'brand', data: { id: brand.id || undefined, name: brand.name.trim(), slug: brand.slug.trim(), logo: brand.logo } },
      });
      push(brand.id ? 'برند به‌روزرسانی شد.' : 'برند جدید ثبت شد.', 'success');
      setBrand(null);
      router.refresh();
    } catch (e) { push(e.message, 'error'); } finally { setBusy(false); }
  };

  const remove = async () => {
    const d = del;
    setDel(null);
    try {
      await apiFetch(`/api/admin/categories?id=${d.id}&kind=${d.kind}`, { method: 'DELETE' });
      push('با موفقیت حذف شد.', 'success');
      router.refresh();
    } catch (e) { push(e.message, 'error'); }
  };

  const readImage = (file, cb) => {
    if (!file || file.size > 1_500_000) return push('حجم تصویر باید کمتر از ۱.۵ مگابایت باشد.', 'error');
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsDataURL(file);
  };

  const Row = ({ c, isChild }) => {
    const I = Icons[c.icon] || Icons.package;
    return (
      <div
        className="flex items-center gap-3 py-3 px-3 rounded-theme hover:bg-[var(--surface-2)] transition-colors"
        style={{ marginInlineStart: isChild ? 28 : 0, opacity: c.isActive ? 1 : 0.5 }}
      >
        {isChild && <span className="text-muted shrink-0"><Icons.chevronLeft size={13} /></span>}
        {c.image ? (
          <div className="w-10 h-10 rounded-theme overflow-hidden shrink-0"><ProductImage src={c.image} alt={c.name} ratio="1/1" /></div>
        ) : (
          <span className="w-10 h-10 rounded-theme grid place-items-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><I size={17} /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{c.name}</p>
          <p className="text-[10px] text-muted tabular" dir="ltr">/{c.slug}</p>
        </div>
        <span className="badge shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{toFa(group(c.productCount))} محصول</span>
        {!c.isActive && <span className="badge shrink-0" style={{ background: 'color-mix(in srgb, var(--danger) 14%, transparent)', color: 'var(--danger)' }}>غیرفعال</span>}
        <span className="text-[10px] text-muted tabular shrink-0 hidden sm:inline">ترتیب {toFa(c.sortOrder)}</span>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setCat({ ...c, parentId: c.parentId || '' })} className="btn btn-ghost btn-sm" title="ویرایش"><Icons.edit size={14} /></button>
          <button onClick={() => setDel({ kind: 'category', id: c.id, name: c.name })} className="btn btn-ghost btn-sm" title="حذف"><Icons.trash size={14} style={{ color: 'var(--danger)' }} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* درخت دسته‌بندی */}
      <div className="lg:col-span-2 card p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-extrabold flex items-center gap-2"><Icons.layers size={17} style={{ color: 'var(--primary)' }} /> ساختار دسته‌بندی‌ها</h3>
          <button onClick={() => setCat(emptyCat())} className="btn btn-primary btn-sm"><Icons.plus size={14} /> دسته جدید</button>
        </div>

        {tree.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">هنوز دسته‌بندی‌ای ثبت نشده است.</p>
        ) : (
          <div className="space-y-1">
            {tree.map((r) => (
              <div key={r.id}>
                <Row c={r} />
                {r.children.map((ch) => <Row key={ch.id} c={ch} isChild />)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* برندها */}
      <div className="card p-4 md:p-5 h-fit">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-extrabold flex items-center gap-2"><Icons.tag size={17} style={{ color: 'var(--primary)' }} /> برندها</h3>
          <button onClick={() => setBrand(emptyBrand())} className="btn btn-soft btn-sm"><Icons.plus size={14} /></button>
        </div>

        {brands.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">برندی ثبت نشده است.</p>
        ) : (
          <div className="space-y-1">
            {brands.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-2.5 px-2 rounded-theme hover:bg-[var(--surface-2)]">
                {b.logo ? (
                  <div className="w-9 h-9 rounded-theme overflow-hidden shrink-0"><ProductImage src={b.logo} alt={b.name} ratio="1/1" /></div>
                ) : (
                  <span className="w-9 h-9 rounded-theme grid place-items-center shrink-0 text-xs font-extrabold" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{b.name.slice(0, 2)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{b.name}</p>
                  <p className="text-[10px] text-muted tabular">{toFa(group(b.productCount))} محصول</p>
                </div>
                <button onClick={() => setBrand({ ...b })} className="btn btn-ghost btn-sm"><Icons.edit size={13} /></button>
                <button onClick={() => setDel({ kind: 'brand', id: b.id, name: b.name })} className="btn btn-ghost btn-sm"><Icons.trash size={13} style={{ color: 'var(--danger)' }} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* مودال دسته */}
      {cat && (
        <Modal
          open
          onClose={() => setCat(null)}
          title={cat.id ? `ویرایش دسته: ${cat.name}` : 'افزودن دسته‌بندی'}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCat(null)} className="btn btn-ghost">انصراف</button>
              <button onClick={saveCat} disabled={busy} className="btn btn-primary">{busy ? <Spinner size={15} /> : <Icons.check size={15} />} ذخیره</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">نام دسته‌بندی *</label>
              <input className="input" value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} placeholder="پیراهن مردانه" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">دسته والد</label>
                <select className="input" value={cat.parentId} onChange={(e) => setCat({ ...cat, parentId: e.target.value })}>
                  <option value="">— دسته اصلی —</option>
                  {categories.filter((c) => !c.parentId && c.id !== cat.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">ترتیب نمایش</label>
                <input type="number" dir="ltr" className="input tabular" value={cat.sortOrder} onChange={(e) => setCat({ ...cat, sortOrder: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">اسلاگ (آدرس)</label>
              <input className="input tabular" dir="ltr" value={cat.slug} onChange={(e) => setCat({ ...cat, slug: e.target.value })} placeholder="خودکار از نام" />
            </div>
            <div>
              <label className="label">توضیحات</label>
              <textarea className="input min-h-[70px] leading-7" value={cat.description} onChange={(e) => setCat({ ...cat, description: e.target.value })} />
            </div>
            <div>
              <label className="label">آیکون</label>
              <div className="flex flex-wrap gap-2">
                {ICON_CHOICES.map((ic) => {
                  const I = Icons[ic];
                  const on = cat.icon === ic;
                  return (
                    <button
                      key={ic} onClick={() => setCat({ ...cat, icon: ic })}
                      className="w-10 h-10 rounded-theme grid place-items-center border transition-all"
                      style={{ borderColor: on ? 'var(--primary)' : 'var(--border)', background: on ? 'var(--primary-soft)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text-muted)' }}
                    ><I size={17} /></button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">تصویر دسته</label>
              <div className="flex items-center gap-3">
                {cat.image && <div className="w-16 h-16 rounded-theme overflow-hidden shrink-0"><ProductImage src={cat.image} alt="" ratio="1/1" /></div>}
                <label className="btn btn-soft btn-sm cursor-pointer">
                  <Icons.download size={14} /> انتخاب تصویر
                  <input type="file" accept="image/*" hidden onChange={(e) => readImage(e.target.files?.[0], (d) => setCat((c) => ({ ...c, image: d })))} />
                </label>
                {cat.image && <button onClick={() => setCat({ ...cat, image: '' })} className="btn btn-ghost btn-sm"><Icons.trash size={14} /> حذف</button>}
              </div>
            </div>
            <div className="pt-2 border-t border-line">
              <Switch checked={cat.isActive} onChange={(v) => setCat({ ...cat, isActive: v })} label="فعال" hint="نمایش در منو و صفحه فروشگاه" />
            </div>
          </div>
        </Modal>
      )}

      {/* مودال برند */}
      {brand && (
        <Modal
          open
          onClose={() => setBrand(null)}
          title={brand.id ? `ویرایش برند: ${brand.name}` : 'افزودن برند'}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBrand(null)} className="btn btn-ghost">انصراف</button>
              <button onClick={saveBrand} disabled={busy} className="btn btn-primary">{busy ? <Spinner size={15} /> : <Icons.check size={15} />} ذخیره</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">نام برند *</label>
              <input className="input" value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} placeholder="Vesto Studio" />
            </div>
            <div>
              <label className="label">اسلاگ</label>
              <input className="input tabular" dir="ltr" value={brand.slug} onChange={(e) => setBrand({ ...brand, slug: e.target.value })} placeholder="خودکار از نام" />
            </div>
            <div>
              <label className="label">لوگو</label>
              <div className="flex items-center gap-3">
                {brand.logo && <div className="w-16 h-16 rounded-theme overflow-hidden shrink-0"><ProductImage src={brand.logo} alt="" ratio="1/1" /></div>}
                <label className="btn btn-soft btn-sm cursor-pointer">
                  <Icons.download size={14} /> انتخاب لوگو
                  <input type="file" accept="image/*" hidden onChange={(e) => readImage(e.target.files?.[0], (d) => setBrand((b) => ({ ...b, logo: d })))} />
                </label>
                {brand.logo && <button onClick={() => setBrand({ ...brand, logo: '' })} className="btn btn-ghost btn-sm"><Icons.trash size={14} /></button>}
              </div>
            </div>
          </div>
        </Modal>
      )}

      <Confirm
        open={!!del}
        title={del?.kind === 'brand' ? 'حذف برند' : 'حذف دسته‌بندی'}
        message={`آیا از حذف «${del?.name}» مطمئن هستید؟ اگر محصولی به آن متصل باشد، حذف انجام نخواهد شد.`}
        onCancel={() => setDel(null)}
        onConfirm={remove}
        confirmText="حذف"
      />
    </div>
  );
}
