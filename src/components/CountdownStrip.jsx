'use client';

import { useEffect, useState } from 'react';
import { Icons, toFa } from './ui';

/** نوار شمارش معکوس تخفیف — تا پایان امروز */
export default function CountdownStrip() {
  const [t, setT] = useState(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end - now);
      setT({
        h: Math.floor(diff / 3.6e6),
        m: Math.floor((diff % 3.6e6) / 6e4),
        s: Math.floor((diff % 6e4) / 1000),
      });
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const box = (v) => (
    <span
      className="min-w-[38px] px-2 py-1.5 rounded-[calc(var(--radius)*0.5)] font-extrabold tabular text-center"
      style={{ background: 'var(--surface)', color: 'var(--danger)' }}
    >
      {toFa(String(v).padStart(2, '0'))}
    </span>
  );

  return (
    <div className="container-app pt-6">
      <div
        className="rounded-theme px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)' }}
      >
        <div className="flex items-center gap-2.5 text-center sm:text-right">
          <Icons.clock size={20} style={{ color: 'var(--danger)' }} />
          <div>
            <p className="text-sm font-extrabold" style={{ color: 'var(--danger)' }}>فروش ویژه امروز</p>
            <p className="text-[11px] text-muted mt-0.5">پس از پایان زمان، قیمت‌ها به حالت عادی برمی‌گردد</p>
          </div>
        </div>
        {t && (
          <div className="flex items-center gap-1.5 text-sm" dir="ltr">
            {box(t.h)}<span className="font-extrabold opacity-50">:</span>
            {box(t.m)}<span className="font-extrabold opacity-50">:</span>
            {box(t.s)}
          </div>
        )}
      </div>
    </div>
  );
}
