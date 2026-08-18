export const metadata = { title: 'آفلاین' };

export default function OfflinePage() {
  return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <p className="text-5xl mb-4">📡</p>
        <h1 className="text-xl font-extrabold mb-2">اتصال اینترنت برقرار نیست</h1>
        <p className="text-sm text-muted leading-7 max-w-sm mx-auto">
          صفحاتی که قبلاً بازدید کرده‌اید همچنان در دسترس هستند. پس از وصل شدن اینترنت دوباره تلاش کنید.
        </p>
        <a href="/" className="btn btn-primary mt-6">تلاش دوباره</a>
      </div>
    </div>
  );
}
