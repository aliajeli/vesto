'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, useToast } from './Providers';
import { Icons, Spinner } from './ui';

export default function LogoutButton({ className = 'btn btn-ghost btn-sm' }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await apiFetch('/api/auth/logout', { method: 'POST' });
          push('از حساب خود خارج شدید.', 'success');
          router.push('/');
          router.refresh();
        } catch (e) {
          push(e.message, 'error');
          setBusy(false);
        }
      }}
    >
      {busy ? <Spinner size={14} /> : <Icons.logout size={15} />}
      خروج
    </button>
  );
}
