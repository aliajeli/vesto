import 'server-only';
import prisma from './db';

/** ثبت رویداد در دفتر حسابرسی — هرگز throw نمی‌کند */
export async function logAudit({
  userId = null,
  actorName = null,
  action,
  entity = null,
  entityId = null,
  before = null,
  after = null,
  ip = null,
  userAgent = null,
  severity = 'INFO',
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        actorName,
        action,
        entity,
        entityId,
        before: before ? JSON.stringify(before).slice(0, 4000) : null,
        after: after ? JSON.stringify(after).slice(0, 4000) : null,
        ip,
        userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
        severity,
      },
    });
  } catch (e) {
    console.error('[audit] failed:', e?.message);
  }
}

/** ثبت سند دوطرفه در دفتر کل */
export async function postLedger(entries, tx = prisma) {
  const list = Array.isArray(entries) ? entries : [entries];
  if (!list.length) return;
  await tx.ledgerEntry.createMany({
    data: list.map((e) => ({
      date: e.date || new Date(),
      type: e.type,
      account: e.account,
      debit: Math.max(0, Math.round(e.debit || 0)),
      credit: Math.max(0, Math.round(e.credit || 0)),
      amount: Math.round(e.amount ?? (e.debit || e.credit || 0)),
      refType: e.refType || null,
      refId: e.refId || null,
      description: e.description || null,
    })),
  });
}

/**
 * اسناد حسابداری یک سفارش پرداخت‌شده (روش دوطرفه ساده‌شده)
 * بدهکار: بانک/درگاه — بستانکار: فروش، مالیات، ارسال
 * همچنین بهای تمام‌شده کالای فروش‌رفته (COGS) ثبت می‌شود.
 */
export async function postOrderPaidLedger(order, tx = prisma) {
  // سیستم دوطرفه: مجموع بدهکار همیشه با مجموع بستانکار برابر است.
  // بدهکار: بانک (grandTotal) + تخفیفات (discount) + بهای تمام‌شده (cost)
  // بستانکار: فروش ناخالص (subtotal) + مالیات + حمل‌ونقل + موجودی کالا (cost)
  const entries = [
    {
      type: 'REVENUE',
      account: 'بانک / درگاه پرداخت',
      debit: order.grandTotal,
      amount: order.grandTotal,
      refType: 'ORDER',
      refId: order.id,
      description: `دریافت وجه سفارش ${order.orderNumber}`,
    },
    {
      type: 'REVENUE',
      account: 'فروش کالا',
      credit: order.subtotal,
      amount: order.subtotal,
      refType: 'ORDER',
      refId: order.id,
      description: `فروش ناخالص سفارش ${order.orderNumber}`,
    },
  ];
  if (order.discountTotal > 0) {
    entries.push({
      type: 'DISCOUNT',
      account: 'تخفیفات فروش',
      debit: order.discountTotal,
      amount: order.discountTotal,
      refType: 'ORDER',
      refId: order.id,
      description: `تخفیف سفارش ${order.orderNumber}`,
    });
  }
  if (order.taxTotal > 0) {
    entries.push({
      type: 'TAX',
      account: 'مالیات بر ارزش افزوده پرداختنی',
      credit: order.taxTotal,
      amount: order.taxTotal,
      refType: 'ORDER',
      refId: order.id,
    });
  }
  if (order.shippingTotal > 0) {
    entries.push({
      type: 'SHIPPING',
      account: 'درآمد حمل و نقل',
      credit: order.shippingTotal,
      amount: order.shippingTotal,
      refType: 'ORDER',
      refId: order.id,
    });
  }
  if (order.costTotal > 0) {
    entries.push(
      {
        type: 'COGS',
        account: 'بهای تمام‌شده کالای فروش‌رفته',
        debit: order.costTotal,
        amount: order.costTotal,
        refType: 'ORDER',
        refId: order.id,
      },
      {
        type: 'COGS',
        account: 'موجودی کالا',
        credit: order.costTotal,
        amount: order.costTotal,
        refType: 'ORDER',
        refId: order.id,
        description: `خروج کالا از انبار — سفارش ${order.orderNumber}`,
      },
    );
  }
  await postLedger(entries, tx);
}
