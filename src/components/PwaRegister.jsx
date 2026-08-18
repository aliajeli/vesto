'use client';

import { useEffect, useState } from 'react';
import { Icons } from './ui';

/** ثبت Service Worker + دکمه‌ی نصب اپلیکیشن */
export default function PwaRegister() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
      try {
        if (!localStorage.getItem('vesto_pwa_dismissed')) setVisible(true);
      } catch {
        setVisible(true);
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem('vesto_pwa_dismissed', '1'); } catch {}
  };

  if (!visible || !prompt) return null;

  return (
    <div className="fixed bottom-[74px] lg:bottom-6 inset-x-3 lg:inset-x-auto lg:left-6 z-[120] no-print">
      <div className="card shadow-theme p-4 flex items-center gap-3 lg:max-w-sm animate-fade-up">
        <span className="w-11 h-11 rounded-theme grid place-items-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
          <Icons.download size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold">نصب اپلیکیشن وستو</p>
          <p className="text-[11px] text-muted mt-0.5">خرید سریع‌تر، حتی بدون اینترنت</p>
        </div>
        <button
          onClick={async () => { prompt.prompt(); await prompt.userChoice; dismiss(); }}
          className="btn btn-primary btn-sm shrink-0"
        >
          نصب
        </button>
        <button onClick={dismiss} className="text-muted hover:text-ink shrink-0" aria-label="بستن">
          <Icons.close size={17} />
        </button>
      </div>
    </div>
  );
}
