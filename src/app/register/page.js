import { Suspense } from 'react';
import Shell from '@/components/Shell';
import AuthForm from '@/components/AuthForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'ثبت‌نام' };

export default function RegisterPage() {
  return (
    <Shell>
      <Suspense fallback={null}>
        <AuthForm mode="register" />
      </Suspense>
    </Shell>
  );
}
