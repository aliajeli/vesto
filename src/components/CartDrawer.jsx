'use client';

import Link from 'next/link';
import { useCart, useSettings } from './Providers';
import { Drawer, Icons, money, toFa, EmptyState, ProductImage } from './ui';

export default function CartDrawer() {
  const cart = useCart();
  const s = useSettings();

  const threshold = Number(s.freeShippingThreshold || 0);
  const remaining = Math.max(0, threshold - cart.subtotal);
  const progress = threshold ? Math.min(100, (cart.subtotal / threshold) * 100) : 100;

  return (
    <Drawer
      open={cart.drawerOpen}
      onClose={cart.closeDrawer}
      title={`سبد خرید (${toFa(cart.count)})`}
      side="left"
      footer={
        cart.items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">جمع کالاها</span>
              <span className="font-extrabold tabular">{money(cart.subtotal)}</span>
            </div>
            <p className="text-[11px] text-muted">هزینه ارسال و مالیات در مرحله‌ی پرداخت محاسبه می‌شود.</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" onClick={cart.closeDrawer} className="btn btn-ghost">
                مشاهده سبد
              </Link>
              <Link href="/checkout" onClick={cart.closeDrawer} className="btn btn-primary">
                تسویه حساب
              </Link>
            </div>
          </div>
        )
      }
    >
      {cart.items.length === 0 ? (
        <EmptyState
          icon={Icons.cart}
          title="سبد خرید شما خالی است"
          hint="از میان کالکشن‌های وستو انتخاب کنید و استایل خود را کامل کنید."
          action={
            <Link href="/shop" onClick={cart.closeDrawer} className="btn btn-primary mt-2">
              شروع خرید
            </Link>
          }
        />
      ) : (
        <div>
          {threshold > 0 && (
            <div className="p-4 border-b border-line" style={{ background: 'var(--surface-2)' }}>
              {remaining > 0 ? (
                <p className="text-xs mb-2">
                  <span className="font-bold" style={{ color: 'var(--primary)' }}>{money(remaining)}</span>
                  {' '}تا ارسال رایگان باقی مانده
                </p>
              ) : (
                <p className="text-xs mb-2 font-bold inline-flex items-center gap-1" style={{ color: 'var(--success)' }}>
                  <Icons.check size={14} /> ارسال شما رایگان است
                </p>
              )}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: remaining > 0 ? 'var(--primary)' : 'var(--success)' }}
                />
              </div>
            </div>
          )}

          <ul className="divide-y divide-line">
            {cart.items.map((it) => {
              const key = cart.keyOf(it);
              return (
                <li key={key} className="p-4 flex gap-3">
                  <Link href={`/product/${it.slug}`} onClick={cart.closeDrawer} className="shrink-0">
                    <ProductImage src={it.image} alt={it.name} className="w-20 rounded-theme" ratio="3/4" />
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <Link
                      href={`/product/${it.slug}`}
                      onClick={cart.closeDrawer}
                      className="text-sm font-bold leading-6 line-clamp-2 hover:text-[var(--primary)] transition-colors"
                    >
                      {it.name}
                    </Link>
                    <p className="text-[11px] text-muted mt-1 flex items-center gap-2">
                      {it.size && <span>سایز: {it.size}</span>}
                      {it.color && (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full border border-line" style={{ background: it.colorHex || '#888' }} />
                          {it.color}
                        </span>
                      )}
                    </p>

                    <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-theme border border-line overflow-hidden">
                        <button
                          onClick={() => cart.setQty(key, it.quantity - 1)}
                          className="w-8 h-8 grid place-items-center hover:bg-surface-2 transition-colors"
                          aria-label="کاهش"
                        >
                          <Icons.minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-extrabold tabular">{toFa(it.quantity)}</span>
                        <button
                          onClick={() => cart.setQty(key, Math.min(it.quantity + 1, it.max || 10))}
                          disabled={it.quantity >= (it.max || 10)}
                          className="w-8 h-8 grid place-items-center hover:bg-surface-2 transition-colors disabled:opacity-40"
                          aria-label="افزایش"
                        >
                          <Icons.plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-extrabold tabular" style={{ color: 'var(--primary)' }}>
                        {money(it.unitPrice * it.quantity)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => cart.remove(key)}
                    className="text-muted hover:text-[var(--danger)] transition-colors self-start p-1"
                    aria-label="حذف"
                  >
                    <Icons.trash size={16} />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="p-4">
            <button onClick={cart.clear} className="text-xs text-muted hover:text-[var(--danger)] transition-colors">
              خالی کردن سبد خرید
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
