import { NextResponse } from 'next/server';

/**
 * میان‌افزار سراسری Vesto.
 * نکته: در Edge Runtime نمی‌توان به Prisma یا Node API دسترسی داشت،
 * بنابراین منطق سنگین (حالت تعمیر، احراز هویت کامل) در لایه سرور انجام می‌شود
 * و اینجا فقط هدرهای امنیتی و محافظت‌های سبک اعمال می‌گردد.
 */

const SESSION_COOKIE = 'vesto_session';

// مسیرهایی که هرگز نباید ایندکس شوند
const PRIVATE_PREFIXES = ['/admin', '/account', '/payment', '/checkout', '/cart'];

// متدهایی که نیازمند بررسی هم‌مبدأ هستند
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // ---------------------------------------------- محافظت CSRF در لایه لبه
  if (UNSAFE_METHODS.has(method) && pathname.startsWith('/api/')) {
    const reqOrigin = req.headers.get('origin');
    if (reqOrigin) {
      try {
        const host = req.headers.get('host');
        const o = new URL(reqOrigin);
        if (o.host !== host) {
          return NextResponse.json(
            { ok: false, error: 'درخواست از مبدأ نامعتبر رد شد.' },
            { status: 403, headers: { 'Cache-Control': 'no-store' } },
          );
        }
      } catch {
        return NextResponse.json({ ok: false, error: 'مبدأ درخواست نامعتبر است.' }, { status: 403 });
      }
    }
  }

  // نکته: /admin عمداً هدایت نمی‌شود و 404 می‌دهد تا وجود پنل افشا نشود.

  const res = NextResponse.next();

  // ------------------------------------------------------ هدرهای امنیتی
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  // ---------------------------------------- جلوگیری از ایندکس مسیرهای خصوصی
  if (PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
  }

  // پاسخ APIها هرگز کش نشود
  if (pathname.startsWith('/api/')) {
    res.headers.set('Cache-Control', 'no-store, max-age=0');
  }

  // نشانه‌ای سبک برای لایه سرور که کاربر نشست دارد یا نه (بدون رمزگشایی توکن)
  if (pathname.startsWith('/admin')) {
    res.headers.set('X-Has-Session', req.cookies.get(SESSION_COOKIE) ? '1' : '0');
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * روی همه مسیرها اجرا می‌شود به جز:
     * - فایل‌های استاتیک Next (_next/static، _next/image)
     * - آیکون‌ها، فونت‌ها، manifest و service worker
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|icons/|fonts/|manifest.webmanifest|sw.js|robots.txt|sitemap.xml).*)',
  ],
};
