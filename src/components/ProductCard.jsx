'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart, useSettings } from './Providers';
import { Icons, Badge, Rating, money, toFa, ProductImage } from './ui';

export default function ProductCard({ product, variant = 'standard', priority = false }) {
  const cart = useCart();
  const s = useSettings();
  const [adding, setAdding] = useState(false);

  const off =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  const soldOut = product.totalStock === 0;
  const lowStock = !soldOut && product.totalStock != null && product.totalStock <= (s.lowStockThreshold || 5);

  const quickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    setAdding(true);
    cart.add({
      productId: product.id,
      variantId: product.defaultVariantId || null,
      name: product.name,
      slug: product.slug,
      image: product.image,
      size: product.defaultSize || null,
      color: product.defaultColor || null,
      colorHex: product.defaultColorHex || null,
      unitPrice: product.price,
      quantity: 1,
      max: Math.min(product.totalStock ?? 10, s.maxQtyPerItem || 10),
    });
    setTimeout(() => setAdding(false), 500);
  };

  const ratio = variant === 'tall' ? '2/3' : variant === 'compact' ? '4/5' : '3/4';

  return (
    <article className="group card card-hover overflow-hidden flex flex-col h-full">
      <Link href={`/product/${product.slug}`} className="relative block overflow-hidden">
        <ProductImage src={product.image} alt={product.name} ratio={ratio} priority={priority} />

        {/* نشان‌ها */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-start">
          {off > 0 && <Badge tone="danger">٪{toFa(off)} تخفیف</Badge>}
          {product.isNew && <Badge tone="success">جدید</Badge>}
          {product.isFeatured && variant !== 'compact' && <Badge tone="solid">ویژه</Badge>}
        </div>

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
            <span className="badge text-xs px-3 py-1.5" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
              ناموجود
            </span>
          </div>
        )}

        {/* افزودن سریع — دسکتاپ */}
        {!soldOut && (
          <div className="hidden md:block absolute inset-x-2.5 bottom-2.5 translate-y-[130%] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <button onClick={quickAdd} className="btn btn-primary w-full btn-sm shadow-theme">
              {adding ? <Icons.check size={15} /> : <Icons.cart size={15} />}
              {adding ? 'اضافه شد' : 'افزودن سریع'}
            </button>
          </div>
        )}
      </Link>

      <div className={`flex flex-col flex-1 ${variant === 'compact' ? 'p-2.5' : 'p-3.5'}`}>
        {product.categoryName && variant !== 'compact' && (
          <p className="text-[10px] text-muted mb-1 font-bold">{product.categoryName}</p>
        )}

        <Link href={`/product/${product.slug}`} className="flex-1">
          <h3 className={`font-bold leading-6 line-clamp-2 hover:text-[var(--primary)] transition-colors ${variant === 'compact' ? 'text-[12px]' : 'text-[13px]'}`}>
            {product.name}
          </h3>
        </Link>

        {variant !== 'compact' && product.ratingCount > 0 && (
          <div className="mt-1.5">
            <Rating value={product.ratingAvg} count={product.ratingCount} size={12} />
          </div>
        )}

        {lowStock && (
          <p className="text-[10px] mt-1.5 font-bold" style={{ color: 'var(--warning)' }}>
            تنها {toFa(product.totalStock)} عدد باقی مانده
          </p>
        )}

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            {off > 0 && (
              <p className="text-[11px] text-muted line-through tabular">{money(product.compareAtPrice, '')}</p>
            )}
            <p className={`font-extrabold tabular truncate ${variant === 'compact' ? 'text-[13px]' : 'text-[15px]'}`} style={{ color: 'var(--primary)' }}>
              {money(product.price, s.currencySuffix || 'تومان')}
            </p>
          </div>

          {/* افزودن سریع — موبایل */}
          {!soldOut && (
            <button
              onClick={quickAdd}
              className="md:hidden w-9 h-9 rounded-theme grid place-items-center shrink-0 transition-transform active:scale-90"
              style={{ background: 'var(--primary)', color: 'var(--primary-contrast)' }}
              aria-label="افزودن به سبد"
            >
              {adding ? <Icons.check size={16} /> : <Icons.plus size={16} />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton({ ratio = '3/4' }) {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton w-full" style={{ aspectRatio: ratio }} />
      <div className="p-3.5 space-y-2">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-5 w-1/2 rounded mt-3" />
      </div>
    </div>
  );
}
