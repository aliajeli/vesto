import 'server-only';
import prisma from './db';

/**
 * محاسبه‌ی قیمت سبد **فقط در سرور**.
 * ورودی کلاینت تنها شامل شناسه‌ی محصول/تنوع و تعداد است؛
 * قیمت‌ها همیشه از دیتابیس خوانده می‌شوند تا جعل قیمت ممکن نباشد.
 */
export async function priceCart({ items = [], couponCode = null, userId = null, settings }) {
  const errors = [];
  const clean = [];

  const ids = [...new Set(items.map((i) => String(i.productId || '')).filter(Boolean))];
  if (!ids.length) return { ok: false, errors: ['سبد خرید خالی است.'] };

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    include: { variants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const maxQty = Number(settings?.maxQtyPerItem || 10);

  for (const raw of items) {
    const p = byId.get(String(raw.productId));
    if (!p) {
      errors.push('یکی از محصولات سبد دیگر موجود نیست و حذف شد.');
      continue;
    }
    let qty = Math.floor(Number(raw.quantity || 1));
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    if (qty > maxQty) qty = maxQty;

    let variant = null;
    if (raw.variantId) variant = p.variants.find((v) => v.id === raw.variantId) || null;
    if (!variant && (raw.size || raw.color)) {
      variant =
        p.variants.find(
          (v) => (!raw.size || v.size === raw.size) && (!raw.color || v.color === raw.color)
        ) || null;
    }
    if (!variant && p.variants.length) variant = p.variants.find((v) => v.stock > 0) || p.variants[0];

    const stock = variant ? variant.stock : 9999;
    if (stock <= 0) {
      errors.push(`«${p.name}» موجود نیست.`);
      continue;
    }
    if (qty > stock) {
      qty = stock;
      errors.push(`موجودی «${p.name}» تنها ${stock} عدد است؛ تعداد اصلاح شد.`);
    }

    const unitPrice = p.price + (variant?.priceDiff || 0);
    clean.push({
      productId: p.id,
      variantId: variant?.id || null,
      name: p.name,
      slug: p.slug,
      image: safeFirstImage(p.images),
      size: variant?.size || null,
      color: variant?.color || null,
      colorHex: variant?.colorHex || null,
      unitPrice,
      compareAtPrice: p.compareAtPrice || null,
      costPrice: p.costPrice || 0,
      quantity: qty,
      lineTotal: unitPrice * qty,
      stock,
    });
  }

  if (!clean.length) return { ok: false, errors: errors.length ? errors : ['سبد خرید خالی است.'] };

  const subtotal = clean.reduce((s, i) => s + i.lineTotal, 0);
  const costTotal = clean.reduce((s, i) => s + i.costPrice * i.quantity, 0);

  // ---- کد تخفیف
  let discountTotal = 0;
  let coupon = null;
  let couponError = null;
  if (couponCode) {
    const res = await validateCoupon({ code: couponCode, subtotal, userId });
    if (res.ok) {
      coupon = res.coupon;
      discountTotal = res.discount;
    } else {
      couponError = res.error;
    }
  }

  const taxable = Math.max(0, subtotal - discountTotal);
  const taxPercent = Number(settings?.taxPercent || 0);
  const taxTotal = Math.round((taxable * taxPercent) / 100);

  const freeThreshold = Number(settings?.freeShippingThreshold || 0);
  const shippingTotal =
    freeThreshold > 0 && taxable >= freeThreshold ? 0 : Number(settings?.shippingFlat || 0);

  const grandTotal = taxable + taxTotal + shippingTotal;

  return {
    ok: true,
    items: clean,
    subtotal,
    discountTotal,
    taxTotal,
    taxPercent,
    shippingTotal,
    grandTotal,
    costTotal,
    coupon: coupon
      ? { code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description }
      : null,
    couponError,
    warnings: errors,
    freeShippingRemaining: freeThreshold > 0 ? Math.max(0, freeThreshold - taxable) : 0,
  };
}

export async function validateCoupon({ code, subtotal, userId = null }) {
  const c = await prisma.coupon.findUnique({ where: { code: String(code).trim().toUpperCase() } });
  if (!c || !c.isActive) return { ok: false, error: 'کد تخفیف نامعتبر است.' };

  const now = new Date();
  if (c.startsAt && c.startsAt > now) return { ok: false, error: 'این کد هنوز فعال نشده است.' };
  if (c.endsAt && c.endsAt < now) return { ok: false, error: 'این کد منقضی شده است.' };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit)
    return { ok: false, error: 'ظرفیت استفاده از این کد تمام شده است.' };
  if (subtotal < c.minSubtotal)
    return {
      ok: false,
      error: `حداقل مبلغ سفارش برای این کد ${Math.round(c.minSubtotal / 10).toLocaleString('fa-IR')} تومان است.`,
    };

  if (userId && c.perUserLimit > 0) {
    const used = await prisma.order.count({
      where: { userId, couponCode: c.code, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
    });
    if (used >= c.perUserLimit)
      return { ok: false, error: 'شما قبلاً از این کد استفاده کرده‌اید.' };
  }

  let discount =
    c.type === 'PERCENT' ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
  if (c.maxDiscount != null) discount = Math.min(discount, c.maxDiscount);
  discount = Math.max(0, Math.min(discount, subtotal));

  return { ok: true, coupon: c, discount };
}

export function safeFirstImage(images) {
  try {
    const arr = typeof images === 'string' ? JSON.parse(images) : images;
    return Array.isArray(arr) && arr.length ? arr[0] : null;
  } catch {
    return null;
  }
}

export function parseJsonArray(v, fallback = []) {
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(arr) ? arr : fallback;
  } catch {
    return fallback;
  }
}
