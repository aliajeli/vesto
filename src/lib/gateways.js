import 'server-only';
import { toToman } from './money';

/**
 * لایه‌ی درگاه‌های پرداخت ایرانی.
 *
 * نکات امنیتی کلیدی که در همه‌ی درگاه‌ها رعایت شده است:
 *  1) مبلغ همیشه در سرور از روی سفارش محاسبه می‌شود؛ هرگز از کلاینت گرفته نمی‌شود.
 *  2) پس از بازگشت کاربر، «تأیید سمت سرور» (verify) انجام می‌شود و تا وقتی درگاه
 *     موفقیت را تأیید نکند سفارش پرداخت‌شده تلقی نمی‌شود.
 *  3) مبلغ تأییدشده توسط درگاه با مبلغ سفارش مقایسه می‌شود (Amount Mismatch → رد).
 *  4) کلیدهای درگاه فقط سمت سرور خوانده می‌شوند و به کلاینت ارسال نمی‌شوند.
 */

const TIMEOUT_MS = 15_000;

async function post(url, body) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

async function postForm(url, body, headers = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

export const GATEWAYS = {
  sandbox: { id: 'sandbox', label: 'شبیه‌ساز داخلی (تست)', needs: null },
  zibal: { id: 'zibal', label: 'زیبال', needs: 'zibalMerchant' },
  zarinpal: { id: 'zarinpal', label: 'زرین‌پال', needs: 'zarinpalMerchant' },
  payping: { id: 'payping', label: 'پی‌پینگ', needs: 'paypingToken' },
};

export function gatewayIsConfigured(id, settings) {
  const g = GATEWAYS[id];
  if (!g) return false;
  if (!g.needs) return true;
  return !!settings?.[g.needs];
}

// ------------------------------------------------------------------ زیبال
// https://docs.zibal.ir  — مبالغ به ریال
async function zibalRequest({ merchant, amountRial, callbackUrl, orderId, description, mobile }) {
  const { json } = await post('https://gateway.zibal.ir/v1/request', {
    merchant,
    amount: amountRial,
    callbackUrl,
    orderId,
    description,
    mobile: mobile || undefined,
  });
  if (json?.result === 100 && json?.trackId) {
    return {
      ok: true,
      authority: String(json.trackId),
      redirectUrl: `https://gateway.zibal.ir/start/${json.trackId}`,
      raw: json,
    };
  }
  return { ok: false, error: json?.message || `zibal error ${json?.result}`, raw: json };
}

async function zibalVerify({ merchant, authority }) {
  const { json } = await post('https://gateway.zibal.ir/v1/verify', {
    merchant,
    trackId: Number(authority),
  });
  // 100 = موفق، 201 = قبلاً تأیید شده
  const ok = json?.result === 100 || json?.result === 201;
  return {
    ok,
    alreadyVerified: json?.result === 201,
    amountRial: Number(json?.amount || 0),
    refId: json?.refNumber ? String(json.refNumber) : String(authority),
    cardPan: json?.cardNumber || null,
    error: ok ? null : json?.message || `zibal verify ${json?.result}`,
    raw: json,
  };
}

// ------------------------------------------------------------------ زرین‌پال
// https://docs.zarinpal.com — مبالغ به ریال در v4
async function zarinpalRequest({ merchant, amountRial, callbackUrl, description, mobile, email, sandbox }) {
  const base = sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
  const { json } = await post(`${base}/pg/v4/payment/request.json`, {
    merchant_id: merchant,
    amount: amountRial,
    callback_url: callbackUrl,
    description: description || 'خرید از فروشگاه وستو',
    metadata: { mobile: mobile || undefined, email: email || undefined },
  });
  const data = json?.data;
  if (data?.code === 100 && data?.authority) {
    return {
      ok: true,
      authority: String(data.authority),
      redirectUrl: `${base}/pg/StartPay/${data.authority}`,
      raw: json,
    };
  }
  const err = json?.errors;
  return {
    ok: false,
    error: err?.message || err?.[0]?.message || 'zarinpal request failed',
    raw: json,
  };
}

async function zarinpalVerify({ merchant, authority, amountRial, sandbox }) {
  const base = sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
  const { json } = await post(`${base}/pg/v4/payment/verify.json`, {
    merchant_id: merchant,
    amount: amountRial,
    authority,
  });
  const data = json?.data;
  const ok = data?.code === 100 || data?.code === 101;
  return {
    ok,
    alreadyVerified: data?.code === 101,
    amountRial: Number(data?.amount || amountRial),
    refId: data?.ref_id ? String(data.ref_id) : null,
    cardPan: data?.card_pan || null,
    error: ok ? null : json?.errors?.message || `zarinpal verify ${data?.code}`,
    raw: json,
  };
}

// ------------------------------------------------------------------ پی‌پینگ
// https://docs.payping.io — مبالغ به تومان
async function paypingRequest({ token, amountRial, callbackUrl, orderId, description, mobile }) {
  const { json } = await postForm(
    'https://api.payping.io/v2/pay',
    {
      amount: toToman(amountRial),
      returnUrl: callbackUrl,
      clientRefId: orderId,
      description: description || 'خرید از فروشگاه وستو',
      payerIdentity: mobile || undefined,
    },
    { Authorization: `Bearer ${token}` }
  );
  if (json?.code) {
    return {
      ok: true,
      authority: String(json.code),
      redirectUrl: `https://api.payping.io/v2/pay/gotoipg/${json.code}`,
      raw: json,
    };
  }
  return { ok: false, error: json?.Error || json?.raw || 'payping request failed', raw: json };
}

async function paypingVerify({ token, refId, amountRial }) {
  const { status, json } = await postForm(
    'https://api.payping.io/v2/pay/verify',
    { refId, amount: toToman(amountRial) },
    { Authorization: `Bearer ${token}` }
  );
  const ok = status >= 200 && status < 300;
  return {
    ok,
    alreadyVerified: false,
    amountRial: json?.amount ? Number(json.amount) * 10 : amountRial,
    refId: String(refId),
    cardPan: json?.cardNumber || null,
    error: ok ? null : json?.Error || `payping verify ${status}`,
    raw: json,
  };
}

// ------------------------------------------------------------------ شبیه‌ساز
function sandboxRequest({ orderId, paymentId }) {
  return {
    ok: true,
    authority: `SBX-${paymentId}`,
    redirectUrl: `/payment/sandbox?pid=${encodeURIComponent(paymentId)}`,
    raw: { sandbox: true, orderId },
  };
}

function sandboxVerify({ authority, amountRial, approved }) {
  if (!approved) {
    return { ok: false, amountRial, refId: null, error: 'پرداخت در شبیه‌ساز لغو شد', raw: {} };
  }
  return {
    ok: true,
    alreadyVerified: false,
    amountRial,
    refId: `SBXREF-${String(authority).slice(-8)}-${Date.now().toString().slice(-6)}`,
    cardPan: '6037-****-****-1234',
    error: null,
    raw: { sandbox: true },
  };
}

// ------------------------------------------------------------------ رابط یکسان

export async function createGatewayPayment({ gateway, settings, amountRial, orderId, paymentId, callbackUrl, description, mobile, email }) {
  switch (gateway) {
    case 'zibal':
      return zibalRequest({
        merchant: settings.gatewaySandbox && !settings.zibalMerchant ? 'zibal' : settings.zibalMerchant,
        amountRial,
        callbackUrl,
        orderId,
        description,
        mobile,
      });
    case 'zarinpal':
      return zarinpalRequest({
        merchant: settings.zarinpalMerchant,
        amountRial,
        callbackUrl,
        description,
        mobile,
        email,
        sandbox: !!settings.gatewaySandbox,
      });
    case 'payping':
      return paypingRequest({
        token: settings.paypingToken,
        amountRial,
        callbackUrl,
        orderId,
        description,
        mobile,
      });
    default:
      return sandboxRequest({ orderId, paymentId });
  }
}

export async function verifyGatewayPayment({ gateway, settings, authority, amountRial, approved = true, refId }) {
  switch (gateway) {
    case 'zibal':
      return zibalVerify({
        merchant: settings.gatewaySandbox && !settings.zibalMerchant ? 'zibal' : settings.zibalMerchant,
        authority,
      });
    case 'zarinpal':
      return zarinpalVerify({
        merchant: settings.zarinpalMerchant,
        authority,
        amountRial,
        sandbox: !!settings.gatewaySandbox,
      });
    case 'payping':
      return paypingVerify({ token: settings.paypingToken, refId: refId || authority, amountRial });
    default:
      return sandboxVerify({ authority, amountRial, approved });
  }
}
