'use client';

import { useState } from 'react';
import { Icons, Spinner } from '@/components/ui';
import { useToast } from '@/components/Providers';

export default function ExportButton({ type = 'sales', range = '30d', label = 'خروجی CSV', params = {} }) {
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  const run = async () => {
    setBusy(true);
    try {
      const qs = new URLSearchParams({ type, range, ...params });
      const res = await fetch(`/api/admin/export?${qs}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('خطا در تولید فایل خروجی');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vesto-${type}-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      push('فایل خروجی دانلود شد.', 'success');
    } catch (e) {
      push(e.message || 'خطا در دریافت خروجی', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={run} disabled={busy} className="btn btn-soft btn-sm" title="دانلود گزارش به صورت CSV">
      {busy ? <Spinner size={14} /> : <Icons.download size={14} />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
