import prisma from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { verifyGatewayPayment } from '@/lib/gateways';
import { verifyPaymentSignature } from '@/lib/crypto';
import { logAudit, postOrderPaidLedger } from '@/lib/audit';
import { clientMeta } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * تأیید پرداخت (Callback درگاه).
 *
 * هفت لایه‌ی محافظت در برابر جعل تراکنش:
 *  1) پرداخت باید در دیتابیس وجود داشته باشد و در وضعیت PENDING باشد.
 *  2) امضای HMAC ذخیره‌شده در مرحله‌ی شروع، دوباره محاسبه و مقایسه می‌شود.
 *  3) مبلغ **هرگز** از پارامترهای URL خوانده نمی‌شود؛ از رکورد سفارش می‌آید.
 *  4) تأیید نهایی با فراخوانی سرور-به-سرور درگاه انجام می‌شود.
 *  5) مبلغ اعلامی درگاه با مبلغ سفارش مقایسه می‌شود (Amount Mismatch → رد + هشدار).
 *  6) عملیات در تراکنش اتمیک با شرط status=PENDING انجام می‌شود (ضد Double-Spend / Replay).
 *  7) همه‌ی رویدادها در دفتر حسابرسی ثبت می‌شوند.
 */
async function handle(req) {
  const url = req.nextUrl;
  const sp = url.searchParams;
  const paymentId = sp.get('pid');
  const meta = await clientMeta();
  const settings = await getSettings();

  const redirect = (path) => NextResponse.redirect(new URL(path, url.origin), { status: 303 });

  if (!paymentId) return redirect('/payment/result?status=invalid');

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true } } },
  });

  if (!payment || !payment.order) {
    await logAudit({ action: 'تلاش تأیید پرداخت با شناسه نامعتبر', entity: 'Payment', severity: 'CRITICAL', ip: meta.ip, userAgent: meta.userAgent, after: { paymentId } });
    return redirect('/payment/result?status=invalid');
  }

  const order = payment.order;

  // اگر قبلاً موفق ثبت شده، فقط نتیجه را نشان بده (idempotent)
  if (payment.status === 'SUCCESS') {
    return redirect(`/payment/result?status=success&order=${order.orderNumber}`);
  }
  if (payment.status !== 'PENDING' && payment.status !== 'INITIATED') {
    return redirect(`/payment/result?status=failed&order=${order.orderNumber}`);
  }

  // ---- لایه ۲: بررسی امضای سرور
  const signOk = verifyPaymentSignature({
    orderId: order.id,
    amount: payment.amount,
    gateway: payment.gateway,
    signature: payment.serverHash,
  });
  if (!signOk) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failReason: 'امضای سرور نامعتبر — احتمال دستکاری' } });
    await logAudit({ action: '⚠️ امضای پرداخت نامعتبر — احتمال جعل تراکنش', entity: 'Payment', entityId: payment.id, severity: 'CRITICAL', ip: meta.ip, userAgent: meta.userAgent });
    return redirect(`/payment/result?status=tampered&order=${order.orderNumber}`);
  }

  // ---- لایه ۳: مبلغ از دیتابیس، نه از URL
  const expectedAmount = order.grandTotal;
  if (payment.amount !== expectedAmount) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failReason: 'عدم تطابق مبلغ پرداخت با سفارش' } });
    await logAudit({ action: '⚠️ عدم تطابق مبلغ پرداخت و سفارش', entity: 'Payment', entityId: payment.id, severity: 'CRITICAL', ip: meta.ip, after: { paymentAmount: payment.amount, orderAmount: expectedAmount } });
    return redirect(`/payment/result?status=tampered&order=${order.orderNumber}`);
  }

  // پارامترهای بازگشتی درگاه
  const success = sp.get('success');           // زیبال: 1/0
  const zpStatus = sp.get('Status');           // زرین‌پال: OK/NOK
  const authority = sp.get('Authority') || sp.get('trackId') || sp.get('refid') || sp.get('refId') || payment.authority;
  const sandboxApproved = sp.get('approved') === '1';

  // لغو صریح توسط کاربر
  const userCancelled =
    (payment.gateway === 'zibal' && success === '0') ||
    (payment.gateway === 'zarinpal' && zpStatus && zpStatus !== 'OK') ||
    (payment.gateway === 'sandbox' && sp.get('approved') === '0');

  if (userCancelled) {
    await releaseAndFail(payment, order, 'انصراف کاربر از پرداخت');
    return redirect(`/payment/result?status=cancelled&order=${order.orderNumber}`);
  }

  // ---- لایه ۴: تأیید سرور-به-سرور
  let vr;
  try {
    vr = await verifyGatewayPayment({
      gateway: payment.gateway,
      settings,
      authority,
      amountRial: expectedAmount,
      approved: payment.gateway === 'sandbox' ? sandboxApproved : true,
      refId: sp.get('refid') || sp.get('refId') || authority,
    });
  } catch (e) {
    await logAudit({ action: 'خطا در تأیید پرداخت با درگاه', entity: 'Payment', entityId: payment.id, severity: 'CRITICAL', ip: meta.ip, after: { error: String(e?.message) } });
    return redirect(`/payment/result?status=pending&order=${order.orderNumber}`);
  }

  if (!vr.ok) {
    await releaseAndFail(payment, order, vr.error || 'تأیید نشده توسط درگاه');
    await logAudit({ action: 'پرداخت ناموفق', entity: 'Payment', entityId: payment.id, severity: 'WARN', ip: meta.ip, after: { reason: vr.error } });
    return redirect(`/payment/result?status=failed&order=${order.orderNumber}`);
  }

  // ---- لایه ۵: تطابق مبلغ اعلامی درگاه
  if (vr.amountRial && Math.abs(vr.amountRial - expectedAmount) > 10) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failReason: `مبلغ درگاه (${vr.amountRial}) با سفارش (${expectedAmount}) مطابقت ندارد` } });
    await logAudit({ action: '⚠️ مبلغ تأییدشده درگاه با سفارش مغایرت دارد', entity: 'Payment', entityId: payment.id, severity: 'CRITICAL', ip: meta.ip, after: { gatewayAmount: vr.amountRial, orderAmount: expectedAmount } });
    return redirect(`/payment/result?status=tampered&order=${order.orderNumber}`);
  }

  // ---- لایه ۶: به‌روزرسانی اتمیک (ضد تکرار)
  try {
    await prisma.$transaction(async (tx) => {
      const upd = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ['PENDING', 'INITIATED'] } },
        data: {
          status: 'SUCCESS',
          refId: vr.refId || null,
          cardPan: vr.cardPan || null,
          authority: String(authority || payment.authority || ''),
          verifiedAt: new Date(),
          callbackRaw: JSON.stringify(vr.raw || {}).slice(0, 2000),
        },
      });
      if (upd.count === 0) throw new Error('ALREADY_PROCESSED');

      await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'PAID', paidAt: new Date() },
      });

      if (order.couponCode) {
        await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
      }

      for (const it of order.items) {
        if (it.productId) {
          await tx.product.update({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } }).catch(() => {});
        }
      }

      await postOrderPaidLedger(order, tx);
    });
  } catch (e) {
    if (String(e?.message) === 'ALREADY_PROCESSED') {
      return redirect(`/payment/result?status=success&order=${order.orderNumber}`);
    }
    await logAudit({ action: 'خطا در نهایی‌سازی پرداخت', entity: 'Payment', entityId: payment.id, severity: 'CRITICAL', ip: meta.ip, after: { error: String(e?.message) } });
    return redirect(`/payment/result?status=pending&order=${order.orderNumber}`);
  }

  await logAudit({
    userId: order.userId,
    action: 'پرداخت موفق و تأیید سفارش',
    entity: 'Order',
    entityId: order.id,
    severity: 'INFO',
    ip: meta.ip,
    userAgent: meta.userAgent,
    after: { orderNumber: order.orderNumber, amount: expectedAmount, refId: vr.refId, gateway: payment.gateway },
  });

  return redirect(`/payment/result?status=success&order=${order.orderNumber}&ref=${encodeURIComponent(vr.refId || '')}`);
}

/** بازگرداندن موجودی و علامت‌گذاری شکست */
async function releaseAndFail(payment, order, reason) {
  await prisma
    .$transaction(async (tx) => {
      const p = await tx.payment.findUnique({ where: { id: payment.id } });
      if (p.status === 'SUCCESS') return;
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failReason: String(reason).slice(0, 300) } });
      const o = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
      if (o && o.status === 'PENDING') {
        await tx.order.update({ where: { id: o.id }, data: { status: 'CANCELLED' } });
        for (const it of o.items) {
          if (!it.productId) continue;
          const v = await tx.productVariant.findFirst({
            where: { productId: it.productId, size: it.size || undefined, color: it.color || undefined },
          });
          if (v) await tx.productVariant.update({ where: { id: v.id }, data: { stock: { increment: it.quantity } } });
        }
      }
    })
    .catch(() => {});
}

export const GET = handle;
export const POST = handle;
