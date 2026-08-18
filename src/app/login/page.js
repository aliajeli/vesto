import { Suspense } from 'react';
import Shell from '@/components/Shell';
import AuthForm from '@/components/AuthForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'ورود به حساب' };

export default function LoginPage() {
  return (
    <Shell>
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </Shell>
  );
}
