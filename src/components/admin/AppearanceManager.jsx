'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, useToast } from '@/components/Providers';
import { Icons, Spinner, Switch, Tabs, ProductImage } from '@/components/ui';

const RADII = [
  { id: '', label: 'پیش‌فرض تم' },
  { id: '0px', label: 'تیز' },
  { id: '8px', label: 'کم' },
  { id: '16px', label: 'متوسط' },
  { id: '24px', label: 'زیاد' },
];

export default function AppearanceManager({ initial, themes, layouts, fonts }) {
  const router = useRouter();
  const { push } = useToast();
  const [f, setF] = useState(initial);
  const [tab, setTab] = useState('theme');
  const [busy, setBusy] = useState(false);

  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(initial), [f, initial]);

  const activeTheme = themes.find((t) => t.id === f.theme) || themes[0];
  const activeLayout = layouts.find((l) => l.id === f.layout) || layouts[0];

  const save = async () => {
    setBusy(true);
    try {
      await apiFetch('/api/admin/settings', { method: 'POST', body: { patch: f } });
      push('تغییرات ظاهری ذخیره شد. صفحه فروشگاه را ببینید.', 'success');
      router.refresh();
    } catch (e) { push(e.message, 'error'); } finally { setBusy(false); }
  };

  const readImage = (file, key) => {
    if (!file) return;
    if (file.size > 1_500_000) return push('حجم تصویر باید کمتر از ۱.۵ مگابایت باشد.', 'error');
    const r = new FileReader();
    r.onload = () => set({ [key]: r.result });
    r.readAsDataURL(file);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs
          tabs={[
            { id: 'theme', label: 'تم رنگی' },
            { id: 'layout', label: 'چیدمان' },
            { id: 'brand', label: 'برند و لوگو' },
            { id: 'hero', label: 'بنر اصلی' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <button onClick={save} disabled={busy || !dirty} className="btn btn-primary btn-sm mr-auto">
          {busy ? <Spinner size={15} /> : <Icons.check size={15} />}
          {dirty ? 'ذخیره تغییرات' : 'ذخیره شد'}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {tab === 'theme' && (
            <>
              <div className="card p-4 md:p-5">
                <h3 className="text-sm font-extrabold mb-1">تم رنگی سایت</h3>
                <p className="text-[11px] text-muted mb-4">با انتخاب هر تم، رنگ‌های کل سایت و پنل مدیریت تغییر می‌کند.</p>
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {themes.map((t) => {
                    const on = f.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => set({ theme: t.id })}
                        className="text-right rounded-theme overflow-hidden border-2 transition-all"
                        style={{ borderColor: on ? 'var(--primary)' : 'var(--border)' }}
                      >
                        <div className="p-3" style={{ background: t.vars['--bg'] }}>
                          <div className="rounded-lg p-2.5 mb-2" style={{ background: t.vars['--surface'], border: `1px solid ${t.vars['--border']}` }}>
                            <div className="h-1.5 w-10 rounded-full mb-1.5" style={{ background: t.vars['--primary'] }} />
                            <div className="h-1 w-full rounded-full mb-1" style={{ background: t.vars['--text-muted'], opacity: 0.4 }} />
                            <div className="h-1 w-2/3 rounded-full" style={{ background: t.vars['--text-muted'], opacity: 0.25 }} />
                          </div>
                          <div className="flex gap-1">
                            {['--primary', '--accent', '--success', '--danger'].map((k) => (
                              <span key={k} className="w-4 h-4 rounded-full" style={{ background: t.vars[k] }} />
                            ))}
                          </div>
                        </div>
                        <div className="px-3 py-2.5 flex items-center justify-between gap-2" style={{ background: 'var(--surface)' }}>
                          <span className="text-[11px] font-bold truncate">{t.label}</span>
                          {on && <Icons.check size={14} style={{ color: 'var(--primary)' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card p-4 md:p-5 grid sm:grid-cols-2 gap-5">
                <div>
                  <h3 className="text-sm font-extrabold mb-3">فونت سایت</h3>
                  <div className="space-y-2">
                    {fonts.map((ft) => (
                      <button
                        key={ft.id}
                        onClick={() => set({ font: ft.id })}
                        className="w-full text-right rounded-theme px-4 py-3 border transition-all"
                        style={{
                          borderColor: f.font === ft.id ? 'var(--primary)' : 'var(--border)',
                          background: f.font === ft.id ? 'var(--primary-soft)' : 'transparent',
                          fontFamily: ft.stack,
                        }}
                      >
                        <span className="text-sm font-bold block">{ft.label}</span>
                        <span className="text-[11px] text-muted">نمونه متن فارسی — ۱۲۳۴۵۶۷۸۹۰</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold mb-3">گردی گوشه‌ها</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {RADII.map((r) => (
                      <button
                        key={r.id || 'def'}
                        onClick={() => set({ radius: r.id })}
                        className="px-3 py-3 border text-[11px] font-bold transition-all"
                        style={{
                          borderRadius: r.id || 'var(--radius)',
                          borderColor: f.radius === r.id ? 'var(--primary)' : 'var(--border)',
                          background: f.radius === r.id ? 'var(--primary-soft)' : 'transparent',
                          color: f.radius === r.id ? 'var(--primary)' : 'var(--text-muted)',
                        }}
                      >{r.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'layout' && (
            <div className="card p-4 md:p-5">
              <h3 className="text-sm font-extrabold mb-1">چیدمان کلی سایت</h3>
              <p className="text-[11px] text-muted mb-4">ساختار صفحه اصلی، سبک بنر، تعداد ستون‌های محصول و نوع کارت‌ها را تعیین می‌کند.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {layouts.map((l) => {
                  const on = f.layout === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => set({ layout: l.id })}
                      className="text-right rounded-theme p-4 border-2 transition-all"
                      style={{ borderColor: on ? 'var(--primary)' : 'var(--border)', background: on ? 'var(--primary-soft)' : 'transparent' }}
                    >
                      <LayoutPreview layout={l} />
                      <div className="flex items-start justify-between gap-2 mt-3">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold mb-1">{l.label.split('—')[0]}</p>
                          <p className="text-[10px] text-muted leading-5">{l.label.split('—')[1]}</p>
                        </div>
                        {on && <Icons.check size={16} style={{ color: 'var(--primary)' }} className="shrink-0" />}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        <Chip>{l.columns} ستون</Chip>
                        <Chip>بنر {HERO_FA[l.heroStyle]}</Chip>
                        <Chip>کارت {CARD_FA[l.productCard]}</Chip>
                        <Chip>عرض {WIDTH_FA[l.container]}</Chip>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'brand' && (
            <div className="card p-4 md:p-5 space-y-4">
              <h3 className="text-sm font-extrabold">هویت برند</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">نام فروشگاه (انگلیسی)</label>
                  <input className="input" dir="ltr" value={f.storeName} onChange={(e) => set({ storeName: e.target.value })} />
                </div>
                <div>
                  <label className="label">نام فروشگاه (فارسی)</label>
                  <input className="input" value={f.storeNameFa} onChange={(e) => set({ storeNameFa: e.target.value })} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">متن لوگو</label>
                  <input className="input" dir="ltr" value={f.logoText} onChange={(e) => set({ logoText: e.target.value })} />
                </div>
                <div>
                  <label className="label">شعار برند</label>
                  <input className="input" value={f.tagline} onChange={(e) => set({ tagline: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">تصویر لوگو (اختیاری — جایگزین متن لوگو)</label>
                <div className="flex items-center gap-3">
                  {f.logoImage && <div className="w-20 h-20 rounded-theme overflow-hidden border border-line shrink-0"><ProductImage src={f.logoImage} alt="" ratio="1/1" /></div>}
                  <label className="btn btn-soft btn-sm cursor-pointer"><Icons.download size={14} /> انتخاب فایل
                    <input type="file" accept="image/*" hidden onChange={(e) => readImage(e.target.files?.[0], 'logoImage')} />
                  </label>
                  {f.logoImage && <button onClick={() => set({ logoImage: '' })} className="btn btn-ghost btn-sm"><Icons.trash size={14} /> حذف</button>}
                </div>
              </div>

              <div className="pt-4 border-t border-line space-y-3">
                <Switch checked={f.showAnnouncementBar} onChange={(v) => set({ showAnnouncementBar: v })} label="نوار اعلان بالای سایت" hint="برای اطلاع‌رسانی تخفیف‌ها و کمپین‌ها" />
                {f.showAnnouncementBar && (
                  <div>
                    <label className="label">متن نوار اعلان</label>
                    <input className="input" value={f.announcementText} onChange={(e) => set({ announcementText: e.target.value })} />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-line">
                <label className="label">متن معرفی در فوتر</label>
                <textarea className="input min-h-[80px] leading-7" value={f.footerAbout} onChange={(e) => set({ footerAbout: e.target.value })} />
              </div>
            </div>
          )}

          {tab === 'hero' && (
            <div className="card p-4 md:p-5 space-y-4">
              <h3 className="text-sm font-extrabold">محتوای بنر اصلی صفحه نخست</h3>
              <div>
                <label className="label">عنوان اصلی</label>
                <input className="input text-base font-bold" value={f.heroTitle} onChange={(e) => set({ heroTitle: e.target.value })} />
              </div>
              <div>
                <label className="label">زیرعنوان</label>
                <textarea className="input min-h-[70px] leading-7" value={f.heroSubtitle} onChange={(e) => set({ heroSubtitle: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">متن دکمه</label>
                  <input className="input" value={f.heroCta} onChange={(e) => set({ heroCta: e.target.value })} />
                </div>
                <div>
                  <label className="label">لینک دکمه</label>
                  <input className="input tabular" dir="ltr" value={f.heroCtaLink} onChange={(e) => set({ heroCtaLink: e.target.value })} placeholder="/shop" />
                </div>
              </div>
              <div>
                <label className="label">تصویر پس‌زمینه بنر</label>
                <div className="flex items-center gap-3 flex-wrap">
                  {f.heroImage && <div className="w-32 rounded-theme overflow-hidden border border-line shrink-0"><ProductImage src={f.heroImage} alt="" ratio="16/9" /></div>}
                  <label className="btn btn-soft btn-sm cursor-pointer"><Icons.download size={14} /> بارگذاری تصویر
                    <input type="file" accept="image/*" hidden onChange={(e) => readImage(e.target.files?.[0], 'heroImage')} />
                  </label>
                  <input className="input flex-1 min-w-[200px]" dir="ltr" value={f.heroImage?.startsWith('data:') ? '' : f.heroImage} onChange={(e) => set({ heroImage: e.target.value })} placeholder="یا آدرس تصویر: https://…" />
                  {f.heroImage && <button onClick={() => set({ heroImage: '' })} className="btn btn-ghost btn-sm"><Icons.trash size={14} /></button>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* پیش‌نمایش زنده */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="card p-4">
            <p className="text-xs font-extrabold mb-3 flex items-center gap-2"><Icons.eye size={14} style={{ color: 'var(--primary)' }} /> پیش‌نمایش زنده</p>
            <Preview f={f} theme={activeTheme} layout={activeLayout} fonts={fonts} />
            <a href="/" target="_blank" rel="noreferrer" className="btn btn-soft btn-sm w-full mt-3">
              <Icons.arrowLeft size={14} /> مشاهده سایت واقعی
            </a>
            <p className="text-[10px] text-muted text-center mt-2">پس از ذخیره، تغییرات روی کل سایت اعمال می‌شود.</p>
          </div>
        </div>
      </div>
    </>
  );
}

const HERO_FA = { full: 'تمام‌عرض', split: 'دوستونه', center: 'وسط‌چین', carousel: 'اسلایدر' };
const CARD_FA = { standard: 'استاندارد', tall: 'بلند', minimal: 'مینیمال', compact: 'فشرده' };
const WIDTH_FA = { wide: 'عریض', narrow: 'باریک', full: 'کامل' };

const Chip = ({ children }) => (
  <span className="badge text-[9px]" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{children}</span>
);

function LayoutPreview({ layout }) {
  const cols = layout.columns;
  return (
    <div className="rounded-lg p-2.5 space-y-1.5" style={{ background: 'var(--surface-2)' }}>
      <div className="h-2 rounded-full" style={{ background: 'var(--border)' }} />
      {layout.heroStyle === 'split' ? (
        <div className="flex gap-1.5 h-9">
          <div className="flex-1 rounded" style={{ background: 'var(--primary)', opacity: 0.55 }} />
          <div className="flex-1 rounded" style={{ background: 'var(--border)' }} />
        </div>
      ) : layout.heroStyle === 'center' ? (
        <div className="h-9 rounded grid place-items-center" style={{ background: 'var(--border)' }}>
          <div className="w-1/2 h-1.5 rounded-full" style={{ background: 'var(--primary)', opacity: 0.7 }} />
        </div>
      ) : layout.heroStyle === 'carousel' ? (
        <div className="flex gap-1 h-9">
          <div className="w-3/4 rounded" style={{ background: 'var(--primary)', opacity: 0.55 }} />
          <div className="w-1/4 rounded" style={{ background: 'var(--border)' }} />
        </div>
      ) : (
        <div className="h-9 rounded" style={{ background: 'var(--primary)', opacity: 0.55 }} />
      )}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="rounded"
            style={{
              background: 'var(--border)',
              height: layout.productCard === 'tall' ? 26 : layout.productCard === 'compact' ? 14 : 20,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Preview({ f, theme, layout, fonts }) {
  const v = theme.vars;
  const font = fonts.find((x) => x.id === f.font) || fonts[0];
  const radius = f.radius || v['--radius'];

  return (
    <div className="rounded-theme overflow-hidden border border-line" style={{ background: v['--bg'], color: v['--text'], fontFamily: font.stack }} dir="rtl">
      {f.showAnnouncementBar && (
        <div className="text-[8px] text-center py-1.5 px-2 truncate" style={{ background: v['--primary'], color: v['--primary-contrast'] }}>
          {f.announcementText}
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: v['--border'] }}>
        <span className="text-[11px] font-extrabold tracking-widest" style={{ color: v['--primary'] }}>{f.logoText || f.storeName}</span>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: v['--text-muted'], opacity: 0.35 }} />)}
        </div>
      </div>

      <div className="p-3">
        <div
          className="p-3 mb-2.5 relative overflow-hidden"
          style={{
            borderRadius: radius,
            background: f.heroImage ? `linear-gradient(90deg, ${v['--surface']}dd, ${v['--surface']}66), url(${f.heroImage}) center/cover` : v['--surface'],
            minHeight: 74,
          }}
        >
          <p className="text-[10px] font-extrabold leading-4 mb-1 line-clamp-2">{f.heroTitle}</p>
          <p className="text-[7px] leading-3 line-clamp-2 mb-2" style={{ color: v['--text-muted'] }}>{f.heroSubtitle}</p>
          <span className="inline-block text-[7px] font-bold px-2 py-1" style={{ background: v['--primary'], color: v['--primary-contrast'], borderRadius: `calc(${radius} * 0.6)` }}>
            {f.heroCta}
          </span>
        </div>

        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(layout.columns, 4)}, 1fr)` }}>
          {Array.from({ length: Math.min(layout.columns, 4) }).map((_, i) => (
            <div key={i} style={{ borderRadius: `calc(${radius} * 0.7)`, background: v['--surface'], border: `1px solid ${v['--border']}`, overflow: 'hidden' }}>
              <div style={{ height: layout.productCard === 'tall' ? 44 : layout.productCard === 'compact' ? 26 : 34, background: v['--surface-2'] }} />
              <div className="p-1.5">
                <div className="h-1 rounded-full mb-1" style={{ background: v['--text-muted'], opacity: 0.4 }} />
                <div className="h-1 w-2/3 rounded-full" style={{ background: v['--primary'], opacity: 0.8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 border-t text-[7px] text-center" style={{ borderColor: v['--border'], color: v['--text-muted'] }}>
        {f.storeNameFa} — {f.tagline}
      </div>
    </div>
  );
}
