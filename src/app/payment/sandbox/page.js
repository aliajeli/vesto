import { Suspense } from 'react';
import SandboxClient from './SandboxClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'شبیه‌ساز درگاه پرداخت', robots: { index: false } };

export default function SandboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-muted">در حال بارگذاری…</div>}>
      <SandboxClient />
    </Suspense>
  );
}
