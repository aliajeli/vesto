'use client';

import { useMemo, useState } from 'react';
import { useCart, useToast } from '@/components/Providers';
import { Icons, Badge, Rating, money, toFa, Tabs, faDate, ProductImage } from '@/components/ui';

export default function ProductDetail({ product, settings }) {
  const cart = useCart();
  const { push } = useToast();

  const colors = useMemo(() => {
    const m = new Map();
    for (const v of product.variants) if (!m.has(v.color)) m.set(v.color, v.colorHex);
    return [...m].map(([name, hex]) => ({ name, hex }));
  }, [product.variants]);

  const [color, setColor] = useState(() => {
    const firstInStock = product.variants.find((v) => v.stock > 0);
    return firstInStock?.color || colors[0]?.name || '';
  });

  const sizesForColor = useMemo(
    () => product.variants.filter((v) => v.color === color),
    [product.variants, color]
  );

  const [size, setSize] = useState(() => {
    const v = product.variants.find((x) => x.stock > 0);
    return v?.size || product.variants[0]?.size || '';
  });

  const variant = product.variants.find((v) => v.color === color && v.size === size) || null;
  const stock = variant ? variant.stock : product.totalStock ?? 0;
  const unitPrice = product.price + (variant?.priceDiff || 0);
  const maxQty = Math.min(stock || 0, settings.maxQtyPerItem || 10);

  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [tab, setTab] = useState('desc');
  const [zoom, setZoom] = useState(false);

  const off = product.compareAtPrice && product.compareAtPrice > unitPrice
    ? Math.round(((product.compareAtPrice - unitPrice) / product.compareAtPrice) * 100)
    : 0;

  const images = product.images.length ? product.images : [null];

  const addToCart = () => {
    if (!variant && product.variants.length) {
      push('لطفاً رنگ و سایز را انتخاب کنید.', 'error');
      return;
    }
    if (stock <= 0) {
      push('این ترکیب رنگ و سایز موجود نیست.', 'error');
      return;
    }
    cart.add({
      productId: product.id,
      variantId: variant?.id || null,
      name: product.name,
      slug: product.slug,
      image: product.image,
      size: variant?.size || null,
      color: variant?.color || null,
      colorHex: variant?.colorHex || null,
      unitPrice,
      quantity: Math.min(qty, maxQty || 1),
      max: maxQty || 1,
    });
  };

  const tabs = [
    { id: 'desc', label: 'توضیحات' },
    { id: 'specs', label: 'مشخصات' },
    { id: 'reviews', label: `نظرات (${toFa(product.reviews.length)})` },
    { id: 'shipping', label: 'ارسال و بازگشت' },
  ];

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
        {/* ------------------------------- گالری ------------------------------- */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="relative rounded-theme overflow-hidden group cursor-zoom-in" onClick={() => setZoom(true)}>
            <ProductImage src={images[imgIdx]} alt={product.name} ratio="3/4" priority />
            {off > 0 && (
              <div className="absolute top-3 right-3">
                <Badge tone="danger" className="text-xs px-3 py-1.5">٪{toFa(off)} تخفیف</Badge>
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + images.length) % images.length); }}
                  className="absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 rounded-full grid place-items-center glass opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="تصویر قبلی"
                >
                  <Icons.chevronRight size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % images.length); }}
                  className="absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 rounded-full grid place-items-center glass opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="تصویر بعدی"
                >
                  <Icons.chevronLeft size={18} />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 mt-3 scroll-x no-scrollbar">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className="w-16 md:w-20 shrink-0 rounded-theme overflow-hidden border-2 transition-all"
                  style={{ borderColor: i === imgIdx ? 'var(--primary)' : 'transparent', opacity: i === imgIdx ? 1 : 0.6 }}
                  aria-label={`تصویر ${toFa(i + 1)}`}
                >
                  <ProductImage src={src} alt="" ratio="1/1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------- اطلاعات ------------------------------- */}
        <div>
          {product.brandName && (
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--primary)' }}>{product.brandName}</p>
          )}
          <h1 className="text-xl md:text-3xl font-extrabold leading-9">{product.name}</h1>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {product.ratingCount > 0 && <Rating value={product.ratingAvg} count={product.ratingCount} size={15} />}
            {product.soldCount > 0 && (
              <span className="text-xs text-muted">{toFa(product.soldCount)} فروش موفق</span>
            )}
            {product.sku && <span className="text-xs text-muted">کد: {product.sku}</span>}
          </div>

          {product.shortDesc && <p className="text-sm text-muted mt-3 leading-7">{product.shortDesc}</p>}

          {/* قیمت */}
          <div className="mt-5 p-4 rounded-theme" style={{ background: 'var(--surface-2)' }}>
            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-2xl md:text-3xl font-extrabold tabular" style={{ color: 'var(--primary)' }}>
                {money(unitPrice, settings.currencySuffix || 'تومان')}
              </span>
              {off > 0 && (
                <>
                  <span className="text-sm text-muted line-through tabular">{money(product.compareAtPrice, '')}</span>
                  <Badge tone="danger">{toFa(off)}٪ تخفیف</Badge>
                </>
              )}
            </div>
            {off > 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--success)' }}>
                شما {money(product.compareAtPrice - unitPrice)} صرفه‌جویی می‌کنید
              </p>
            )}
          </div>

          {/* رنگ */}
          {colors.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-extrabold mb-2.5">
                رنگ: <span className="text-muted font-bold">{color}</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {colors.map((c) => {
                  const has = product.variants.some((v) => v.color === c.name && v.stock > 0);
                  return (
                    <button
                      key={c.name}
                      onClick={() => {
                        setColor(c.name);
                        const avail = product.variants.find((v) => v.color === c.name && v.stock > 0);
                        if (avail) setSize(avail.size);
                        setQty(1);
                      }}
                      title={c.name + (has ? '' : ' (ناموجود)')}
                      className="w-10 h-10 rounded-full border-2 grid place-items-center transition-transform hover:scale-110 relative"
                      style={{ background: c.hex, borderColor: color === c.name ? 'var(--primary)' : 'var(--border)', opacity: has ? 1 : 0.35 }}
                    >
                      {color === c.name && (
                        <Icons.check size={16} style={{ color: '#fff', filter: 'drop-shadow(0 0 2px rgba(0,0,0,.9))' }} strokeWidth={3} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* سایز */}
          {sizesForColor.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-extrabold">سایز: <span className="text-muted font-bold">{size}</span></p>
                <button className="text-[11px] text-muted hover:text-ink underline">راهنمای سایز</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setSize(v.size); setQty(1); }}
                    disabled={v.stock === 0}
                    className="min-w-[52px] px-3.5 py-2.5 rounded-theme text-sm font-extrabold border-2 transition-all disabled:opacity-35 disabled:line-through"
                    style={size === v.size
                      ? { background: 'var(--primary)', color: 'var(--primary-contrast)', borderColor: 'var(--primary)' }
                      : { borderColor: 'var(--border)' }}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* موجودی */}
          <div className="mt-5">
            {stock > 0 ? (
              stock <= (settings.lowStockThreshold || 5) ? (
                <p className="text-xs font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--warning)' }}>
                  <Icons.alert size={14} /> تنها {toFa(stock)} عدد باقی مانده — عجله کنید!
                </p>
              ) : (
                <p className="text-xs font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
                  <Icons.check size={14} /> موجود در انبار
                </p>
              )
            ) : (
              <p className="text-xs font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                <Icons.close size={14} /> این ترکیب موجود نیست
              </p>
            )}
          </div>

          {/* تعداد + افزودن */}
          <div className="mt-5 flex items-stretch gap-3">
            <div className="inline-flex items-center rounded-theme border border-line overflow-hidden shrink-0">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-full grid place-items-center hover:bg-surface-2" aria-label="کاهش">
                <Icons.minus size={16} />
              </button>
              <span className="w-12 text-center font-extrabold tabular">{toFa(qty)}</span>
              <button onClick={() => setQty((q) => Math.min(maxQty || 1, q + 1))} disabled={qty >= maxQty} className="w-11 h-full grid place-items-center hover:bg-surface-2 disabled:opacity-40" aria-label="افزایش">
                <Icons.plus size={16} />
              </button>
            </div>
            <button onClick={addToCart} disabled={stock <= 0} className="btn btn-primary btn-lg flex-1">
              <Icons.cart size={18} />
              {stock > 0 ? 'افزودن به سبد خرید' : 'ناموجود'}
            </button>
          </div>

          {/* مزایا */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {[
              { i: Icons.truck, t: 'ارسال سریع', s: '۱ تا ۴ روز کاری' },
              { i: Icons.refresh, t: '۷ روز بازگشت', s: 'ضمانت بازگشت وجه' },
              { i: Icons.shield, t: 'اصالت کالا', s: 'تضمین اورجینال' },
              { i: Icons.wallet, t: 'پرداخت امن', s: 'درگاه معتبر بانکی' },
            ].map((b) => (
              <div key={b.t} className="flex items-center gap-2.5 p-3 rounded-theme" style={{ background: 'var(--surface-2)' }}>
                <b.i size={19} style={{ color: 'var(--primary)' }} className="shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold truncate">{b.t}</p>
                  <p className="text-[10px] text-muted truncate">{b.s}</p>
                </div>
              </div>
            ))}
          </div>

          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5">
              {product.tags.map((t) => (
                <span key={t} className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------- تب‌ها ------------------------------- */}
      <div className="mt-12">
        <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-5 inline-flex" />

        <div className="card p-5 md:p-7">
          {tab === 'desc' && (
            <div className="text-sm leading-8 whitespace-pre-line text-muted">
              {product.description || 'توضیحاتی برای این محصول ثبت نشده است.'}
            </div>
          )}

          {tab === 'specs' && (
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
              {[
                ['نام محصول', product.name],
                ['برند', product.brandName],
                ['دسته‌بندی', product.categoryName],
                ['جنس پارچه', product.material],
                ['کشور سازنده', product.origin],
                ['وزن', product.weightGram ? `${toFa(product.weightGram)} گرم` : null],
                ['کد کالا', product.sku],
                ['سایزهای موجود', [...new Set(product.variants.filter((v) => v.stock > 0).map((v) => v.size))].join('، ')],
                ['رنگ‌های موجود', [...new Set(product.variants.filter((v) => v.stock > 0).map((v) => v.color))].join('، ')],
                ['راهنمای نگهداری', product.careGuide],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-line">
                    <dt className="text-muted shrink-0">{k}</dt>
                    <dd className="font-bold text-left">{v}</dd>
                  </div>
                ))}
            </dl>
          )}

          {tab === 'reviews' && (
            <div>
              {product.reviews.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">هنوز نظری برای این محصول ثبت نشده است.</p>
              ) : (
                <>
                  <div className="flex items-center gap-6 pb-5 mb-5 border-b border-line flex-wrap">
                    <div className="text-center">
                      <p className="text-4xl font-extrabold" style={{ color: 'var(--primary)' }}>
                        {toFa(product.ratingAvg.toFixed(1))}
                      </p>
                      <Rating value={product.ratingAvg} showCount={false} size={14} />
                      <p className="text-[11px] text-muted mt-1">{toFa(product.ratingCount)} نظر</p>
                    </div>
                    <div className="flex-1 min-w-[200px] space-y-1.5">
                      {[5, 4, 3, 2, 1].map((n) => {
                        const c = product.reviews.filter((r) => r.rating === n).length;
                        const pct = product.reviews.length ? (c / product.reviews.length) * 100 : 0;
                        return (
                          <div key={n} className="flex items-center gap-2 text-[11px]">
                            <span className="w-4 tabular">{toFa(n)}</span>
                            <Icons.star size={11} style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--warning)' }} />
                            </div>
                            <span className="w-6 text-muted tabular">{toFa(c)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <ul className="space-y-4">
                    {product.reviews.map((r) => (
                      <li key={r.id} className="pb-4 border-b border-line last:border-0">
                        <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full grid place-items-center text-xs font-extrabold shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                              {r.author.charAt(0)}
                            </span>
                            <div>
                              <p className="text-xs font-extrabold">{r.author}</p>
                              <p className="text-[10px] text-muted">{faDate(r.createdAt)}</p>
                            </div>
                          </div>
                          <Rating value={r.rating} showCount={false} size={12} />
                        </div>
                        {r.title && <p className="text-sm font-bold mb-1">{r.title}</p>}
                        <p className="text-sm text-muted leading-7">{r.body}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {tab === 'shipping' && (
            <div className="space-y-5 text-sm leading-8 text-muted">
              <div>
                <h4 className="font-extrabold text-ink mb-1.5 flex items-center gap-2"><Icons.truck size={17} /> شرایط ارسال</h4>
                <p>{settings.shippingPolicy}</p>
              </div>
              <div>
                <h4 className="font-extrabold text-ink mb-1.5 flex items-center gap-2"><Icons.refresh size={17} /> شرایط بازگشت</h4>
                <p>{settings.returnPolicy}</p>
              </div>
              <div>
                <h4 className="font-extrabold text-ink mb-1.5 flex items-center gap-2"><Icons.shield size={17} /> پرداخت امن</h4>
                <p>تمام تراکنش‌ها از طریق درگاه‌های معتبر بانکی و با رمزنگاری SSL انجام می‌شود. اطلاعات کارت شما هرگز در سرورهای ما ذخیره نمی‌شود.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نوار خرید چسبان موبایل */}
      <div
        className="lg:hidden fixed bottom-[62px] inset-x-0 z-[105] glass p-3 flex items-center gap-3 no-print"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="min-w-0">
          <p className="text-[10px] text-muted">قیمت</p>
          <p className="text-sm font-extrabold tabular truncate" style={{ color: 'var(--primary)' }}>
            {money(unitPrice)}
          </p>
        </div>
        <button onClick={addToCart} disabled={stock <= 0} className="btn btn-primary flex-1">
          <Icons.cart size={17} />
          {stock > 0 ? 'افزودن به سبد' : 'ناموجود'}
        </button>
      </div>
      <div className="lg:hidden h-16" aria-hidden />

      {/* بزرگ‌نمایی تصویر */}
      {zoom && (
        <div className="fixed inset-0 z-[190] bg-black/92 grid place-items-center p-4" onClick={() => setZoom(false)}>
          <button className="absolute top-4 left-4 text-white/80 hover:text-white" aria-label="بستن">
            <Icons.close size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[imgIdx]} alt={product.name} className="max-h-[90vh] max-w-full object-contain rounded-theme" />
        </div>
      )}
    </>
  );
}
