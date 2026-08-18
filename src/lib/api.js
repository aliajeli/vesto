import 'server-only';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { CSRF_COOKIE } from './auth';
import { safeEqual } from './crypto';

export function json(data, init = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init.headers || {}) },
  });
}

export function ok(data = {}) {
  return json({ ok: true, ...data });
}

export function fail(message, status = 400, extra = {}) {
  return json({ ok: false, error: message, ...extra }, { status });
}

export function handleError(e) {
  const status = e?.status || 500;
  if (status === 401) return fail('برای انجام این عملیات باید وارد شوید.', 401);
  if (status === 403) return fail('دسترسی غیرمجاز.', 403);
  if (process.env.NODE_ENV !== 'production') console.error('[api]', e);
  // پیام خطای داخلی هرگز به کلاینت لو نمی‌رود
  return fail('خطای داخلی سرور. لطفاً دوباره تلاش کنید.', 500);
}

/** بررسی هم‌مبدأ بودن درخواست (محافظت CSRF) */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get('origin');
  const host = h.get('host');
  if (!origin) return true; // درخواست‌های non-browser یا same-origin fetch بدون origin
  try {
    const o = new URL(origin);
    if (o.host !== host) {
      throw Object.assign(new Error('CSRF_ORIGIN'), { status: 403 });
    }
  } catch (err) {
    if (err?.status === 403) throw err;
    throw Object.assign(new Error('CSRF_ORIGIN'), { status: 403 });
  }
  return true;
}

/** بررسی توکن CSRF دوگانه (کوکی + هدر) برای عملیات حساس */
export async function assertCsrf(req) {
  await assertSameOrigin();
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = req?.headers?.get('x-csrf-token');
  if (!cookieToken) return true; // کاربر مهمان بدون نشست
  if (!headerToken || !safeEqual(cookieToken, headerToken)) {
    throw Object.assign(new Error('CSRF'), { status: 403 });
  }
  return true;
}

export async function readJson(req, maxBytes = 1_000_000) {
  const text = await req.text();
  if (text.length > maxBytes) throw Object.assign(new Error('PAYLOAD'), { status: 413 });
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw Object.assign(new Error('BAD_JSON'), { status: 400 });
  }
}

/** اعتبارسنجی با zod و پیام فارسی */
export function validate(schema, data) {
  const res = schema.safeParse(data);
  if (!res.success) {
    const first = res.error.issues?.[0];
    throw Object.assign(new Error(first?.message || 'ورودی نامعتبر'), {
      status: 400,
      userMessage: first?.message || 'ورودی نامعتبر است.',
    });
  }
  return res.data;
}

export function validateOrFail(schema, data) {
  const res = schema.safeParse(data);
  if (!res.success) {
    const msg = res.error.issues?.[0]?.message || 'ورودی نامعتبر است.';
    return { ok: false, response: fail(msg, 400) };
  }
  return { ok: true, data: res.data };
}

/** پاکسازی رشته‌های ورودی از کاراکترهای خطرناک برای جلوگیری از XSS ذخیره‌شده */
export function sanitizeText(input, maxLen = 5000) {
  if (input == null) return '';
  return String(input)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/<\s*script/gi, '&lt;script')
    .replace(/<\s*\/\s*script/gi, '&lt;/script')
    .replace(/javascript:/gi, '')
    .replace(/on(click|error|load|mouseover|focus)\s*=/gi, '')
    .slice(0, maxLen)
    .trim();
}

/** آدرس تصویر امن: فقط http(s) و data:image و مسیر نسبی */
export function sanitizeUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^\//.test(u)) return u.slice(0, 2000);
  if (/^https?:\/\//i.test(u)) return u.slice(0, 2000);
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(u)) return u.slice(0, 3_000_000);
  return '';
}
