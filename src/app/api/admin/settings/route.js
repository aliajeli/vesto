import { z } from 'zod';
import { requireAdmin, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, assertCsrf, readJson, sanitizeText, sanitizeUrl } from '@/lib/api';
import { getSettings, setSettings, DEFAULT_SETTINGS, SECRET_KEYS } from '@/lib/settings';
import { THEMES, LAYOUTS, FONTS } from '@/lib/themes';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const BOOL_KEYS = new Set(['showAnnouncementBar', 'allowGuestCheckout', 'gatewaySandbox', 'maintenanceMode']);
const NUM_KEYS = new Set(['taxPercent', 'shippingFlat', 'freeShippingThreshold', 'lowStockThreshold', 'maxQtyPerItem']);
const URL_KEYS = new Set(['logoImage', 'favicon', 'heroImage', 'instagram', 'telegram', 'whatsapp', 'heroCtaLink']);
const LONG_KEYS = new Set(['description', 'announcementText', 'heroSubtitle', 'footerAbout', 'returnPolicy', 'shippingPolicy', 'maintenanceMessage', 'address']);

const NUM_LIMITS = {
  taxPercent: [0, 100],
  shippingFlat: [0, 100_000_000],
  freeShippingThreshold: [0, 10_000_000_000],
  lowStockThreshold: [0, 1000],
  maxQtyPerItem: [1, 100],
};

export async function GET() {
  try {
    await requireAdmin();
    const s = await getSettings({ fresh: true });
    // کلیدهای محرمانه فقط به‌صورت ماسک‌شده برگردانده می‌شوند
    const out = { ...s };
    for (const k of SECRET_KEYS) {
      out[k] = s[k] ? `${'•'.repeat(Math.max(0, String(s[k]).length - 4))}${String(s[k]).slice(-4)}` : '';
      out[`${k}__set`] = !!s[k];
    }
    return ok({ settings: out, themes: Object.values(THEMES), layouts: Object.values(LAYOUTS), fonts: Object.values(FONTS) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const body = await readJson(req, 8_000_000);
    const patch = body?.patch;
    if (!patch || typeof patch !== 'object') return fail('داده‌ای برای ذخیره ارسال نشده است.', 400);

    const before = await getSettings({ fresh: true });
    const clean = {};

    for (const [key, raw] of Object.entries(patch)) {
      if (!(key in DEFAULT_SETTINGS)) continue; // فقط کلیدهای شناخته‌شده

      // کلیدهای محرمانه: مقدار ماسک‌شده نادیده گرفته می‌شود
      if (SECRET_KEYS.has(key)) {
        const v = String(raw || '').trim();
        if (!v || /^•+/.test(v)) continue;
        clean[key] = sanitizeText(v, 200);
        continue;
      }

      if (BOOL_KEYS.has(key)) { clean[key] = !!raw; continue; }

      if (NUM_KEYS.has(key)) {
        const n = Math.round(Number(raw));
        if (!Number.isFinite(n)) continue;
        const [min, max] = NUM_LIMITS[key] || [0, Number.MAX_SAFE_INTEGER];
        clean[key] = Math.min(max, Math.max(min, n));
        continue;
      }

      if (key === 'theme') { clean.theme = THEMES[raw] ? raw : 'midnight'; continue; }
      if (key === 'layout') { clean.layout = LAYOUTS[raw] ? raw : 'editorial'; continue; }
      if (key === 'font') { clean.font = FONTS[raw] ? raw : 'vazir'; continue; }
      if (key === 'radius') { clean.radius = /^\d{1,2}px$/.test(String(raw)) ? String(raw) : ''; continue; }
      if (key === 'activeGateway') {
        clean.activeGateway = ['sandbox', 'zibal', 'zarinpal', 'payping'].includes(raw) ? raw : 'sandbox';
        continue;
      }

      if (URL_KEYS.has(key)) {
        const v = String(raw || '').trim();
        clean[key] = v ? sanitizeUrl(v) : '';
        continue;
      }

      clean[key] = sanitizeText(raw, LONG_KEYS.has(key) ? 2000 : 300);
    }

    if (!Object.keys(clean).length) return fail('هیچ مقدار معتبری برای ذخیره یافت نشد.', 400);

    // اگر درگاه غیرشبیه‌ساز انتخاب شده اما کلید ندارد، هشدار می‌دهیم
    const merged = { ...before, ...clean };
    if (merged.activeGateway === 'zibal' && !merged.zibalMerchant && !merged.gatewaySandbox) {
      return fail('برای فعال‌سازی زیبال باید Merchant ID را وارد کنید یا حالت آزمایشی را روشن بگذارید.', 400);
    }
    if (merged.activeGateway === 'zarinpal' && !merged.zarinpalMerchant && !merged.gatewaySandbox) {
      return fail('برای فعال‌سازی زرین‌پال باید Merchant ID را وارد کنید یا حالت آزمایشی را روشن بگذارید.', 400);
    }
    if (merged.activeGateway === 'payping' && !merged.paypingToken && !merged.gatewaySandbox) {
      return fail('برای فعال‌سازی پی‌پینگ باید توکن API را وارد کنید یا حالت آزمایشی را روشن بگذارید.', 400);
    }

    await setSettings(clean);

    const diffBefore = {}, diffAfter = {};
    for (const k of Object.keys(clean)) {
      if (SECRET_KEYS.has(k)) { diffBefore[k] = '***'; diffAfter[k] = '***(changed)'; continue; }
      if (String(before[k]).length > 200 || String(clean[k]).length > 200) { diffBefore[k] = '(long)'; diffAfter[k] = '(long, changed)'; continue; }
      if (before[k] !== clean[k]) { diffBefore[k] = before[k]; diffAfter[k] = clean[k]; }
    }

    const meta = await clientMeta();
    await logAudit({
      userId: admin.id, actorName: admin.name, action: 'تغییر تنظیمات فروشگاه', entity: 'Setting',
      entityId: Object.keys(clean).join(','),
      severity: Object.keys(clean).some((k) => SECRET_KEYS.has(k) || k === 'activeGateway' || k === 'maintenanceMode') ? 'CRITICAL' : 'INFO',
      before: JSON.stringify(diffBefore).slice(0, 3000),
      after: JSON.stringify(diffAfter).slice(0, 3000),
      ...meta,
    });

    return ok({ saved: Object.keys(clean).length });
  } catch (e) {
    return handleError(e);
  }
}
