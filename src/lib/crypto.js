import crypto from 'crypto';

function requireSecret(name, devFallback) {
  const v = process.env[name];
  if (v && v.length >= 24) return v;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`متغیر محیطی ${name} تنظیم نشده یا کوتاه است.`);
  }
  return devFallback;
}

export const AUTH_SECRET = requireSecret('AUTH_SECRET', 'dev-insecure-auth-secret-please-change');
export const PAYMENT_HMAC_SECRET = requireSecret(
  'PAYMENT_HMAC_SECRET',
  'dev-insecure-payment-secret-please-change'
);

export function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

export function hmac(input, secret = PAYMENT_HMAC_SECRET) {
  return crypto.createHmac('sha256', secret).update(String(input)).digest('hex');
}

/** مقایسه‌ی زمان‌ثابت برای جلوگیری از timing attack */
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * امضای تراکنش: مبلغ + شناسه سفارش + درگاه را با کلید سرور امضا می‌کند.
 * در مرحله verify دوباره محاسبه و مقایسه می‌شود تا هیچ‌کس نتواند مبلغ را جعل کند.
 */
export function signPayment({ orderId, amount, gateway }) {
  return hmac(`${orderId}|${amount}|${gateway}`);
}

export function verifyPaymentSignature({ orderId, amount, gateway, signature }) {
  return safeEqual(signPayment({ orderId, amount, gateway }), signature || '');
}

export function generateOrderNumber() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VS-${stamp}-${rand}`;
}
