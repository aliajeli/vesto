import Link from 'next/link';

export const metadata = { title: 'صفحه یافت نشد' };

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <p className="text-7xl font-extrabold tabular" style={{ color: 'var(--primary)' }}>۴۰۴</p>
        <h1 className="text-xl font-extrabold mt-4 mb-2">این صفحه پیدا نشد</h1>
        <p className="text-sm text-muted leading-7 max-w-sm mx-auto">
          ممکن است آدرس را اشتباه وارد کرده باشید یا این محصول دیگر موجود نباشد.
        </p>
        <div className="flex gap-2 justify-center mt-6">
          <Link href="/" className="btn btn-primary">بازگشت به خانه</Link>
          <Link href="/shop" className="btn btn-ghost">مشاهده فروشگاه</Link>
        </div>
      </div>
    </div>
  );
}
