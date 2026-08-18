'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ Toast */

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx) || { push: () => {} };

function ToastHost({ toasts, remove }) {
  return (
    <div className="fixed z-[200] bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 flex flex-col gap-2 w-[min(92vw,380px)] no-print pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto animate-fade-up card px-4 py-3 flex items-start gap-3 shadow-theme"
          style={{
            borderColor:
              t.type === 'error' ? 'var(--danger)' : t.type === 'success' ? 'var(--success)' : 'var(--border)',
          }}
        >
          <span
            className="mt-[3px] w-2 h-2 rounded-full shrink-0"
            style={{
              background:
                t.type === 'error' ? 'var(--danger)' : t.type === 'success' ? 'var(--success)' : 'var(--primary)',
            }}
          />
          <p className="text-sm leading-6 flex-1">{t.message}</p>
          <button
            onClick={() => remove(t.id)}
            aria-label="بستن"
            className="text-muted hover:text-ink text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Cart */

const CART_KEY = 'vesto_cart_v1';
const CartCtx = createContext(null);
export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used inside Providers');
  return ctx;
};

function lineKey(i) {
  return `${i.productId}::${i.variantId || ''}`;
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.items, hydrated: true };
    case 'ADD': {
      const k = lineKey(action.item);
      const idx = state.items.findIndex((i) => lineKey(i) === k);
      let items;
      if (idx >= 0) {
        items = state.items.map((i, n) =>
          n === idx
            ? { ...i, quantity: Math.min(i.quantity + (action.item.quantity || 1), action.item.max || 10) }
            : i
        );
      } else {
        items = [...state.items, { ...action.item, quantity: action.item.quantity || 1 }];
      }
      return { ...state, items };
    }
    case 'SET_QTY': {
      const items = state.items
        .map((i) => (lineKey(i) === action.key ? { ...i, quantity: Math.max(0, action.quantity) } : i))
        .filter((i) => i.quantity > 0);
      return { ...state, items };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => lineKey(i) !== action.key) };
    case 'CLEAR':
      return { ...state, items: [] };
    default:
      return state;
  }
}

/* ------------------------------------------------------------- Providers */

export default function Providers({ children, settings }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current[id]);
  }, []);

  const push = useCallback(
    (message, type = 'info', ttl = 3800) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      timers.current[id] = setTimeout(() => remove(id), ttl);
    },
    [remove]
  );

  const [cart, dispatch] = useReducer(cartReducer, { items: [], hydrated: false });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      dispatch({ type: 'HYDRATE', items: Array.isArray(parsed) ? parsed.slice(0, 60) : [] });
    } catch {
      dispatch({ type: 'HYDRATE', items: [] });
    }
  }, []);

  useEffect(() => {
    if (!cart.hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart.items));
    } catch {}
  }, [cart.items, cart.hydrated]);

  // همگام‌سازی بین تب‌ها
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CART_KEY && e.newValue) {
        try {
          dispatch({ type: 'HYDRATE', items: JSON.parse(e.newValue) });
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const api = useMemo(() => {
    const count = cart.items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return {
      items: cart.items,
      hydrated: cart.hydrated,
      count,
      subtotal,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add: (item, { silent = false, open = true } = {}) => {
        dispatch({ type: 'ADD', item });
        if (!silent) push(`«${item.name}» به سبد خرید اضافه شد.`, 'success');
        if (open) setDrawerOpen(true);
      },
      setQty: (key, quantity) => dispatch({ type: 'SET_QTY', key, quantity }),
      remove: (key) => dispatch({ type: 'REMOVE', key }),
      clear: () => dispatch({ type: 'CLEAR' }),
      keyOf: lineKey,
    };
  }, [cart.items, cart.hydrated, drawerOpen, push]);

  return (
    <ToastCtx.Provider value={{ push }}>
      <CartCtx.Provider value={api}>
        <SettingsCtx.Provider value={settings || {}}>{children}</SettingsCtx.Provider>
        <ToastHost toasts={toasts} remove={remove} />
      </CartCtx.Provider>
    </ToastCtx.Provider>
  );
}

/* --------------------------------------------------------------- Settings */

const SettingsCtx = createContext({});
export const useSettings = () => useContext(SettingsCtx);

/* ---------------------------------------------------------------- helpers */

export function useCsrf() {
  const [token, setToken] = useState('');
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)vesto_csrf=([^;]+)/);
    setToken(m ? decodeURIComponent(m[1]) : '');
  }, []);
  return token;
}

/** fetch با هدر CSRF و مدیریت خطای یکنواخت */
export async function apiFetch(url, { method = 'GET', body, headers = {} } = {}) {
  const m = typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)vesto_csrf=([^;]+)/) : null;
  const csrf = m ? decodeURIComponent(m[1]) : '';
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = { ok: false, error: 'پاسخ نامعتبر از سرور' };
  }
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `خطا (${res.status})`);
  }
  return data;
}
