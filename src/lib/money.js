/**
 * تمام مبالغ در دیتابیس به «ریال» و به صورت عدد صحیح ذخیره می‌شوند.
 * نمایش به کاربر به «تومان» است (ریال / 10).
 */

export const RIAL_PER_TOMAN = 10;

export function toToman(rial) {
  return Math.round(Number(rial || 0) / RIAL_PER_TOMAN);
}

export function toRial(toman) {
  return Math.round(Number(toman || 0) * RIAL_PER_TOMAN);
}

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toFaDigits(input) {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function groupDigits(n) {
  const v = Math.round(Number(n || 0));
  const sign = v < 0 ? '-' : '';
  return sign + Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
}

/** قیمت ریالی را به رشته «۱٬۲۳۴٬۵۶۷ تومان» تبدیل می‌کند */
export function formatPrice(rial, { fa = true, suffix = 'تومان' } = {}) {
  const t = groupDigits(toToman(rial));
  const s = fa ? toFaDigits(t) : t;
  return suffix ? `${s} ${suffix}` : s;
}

/** برای نمودارها و اعداد خام تومانی */
export function formatToman(toman, { fa = true } = {}) {
  const s = groupDigits(toman);
  return fa ? toFaDigits(s) : s;
}

export function formatCompact(rial) {
  const t = toToman(rial);
  if (t >= 1_000_000_000) return toFaDigits((t / 1_000_000_000).toFixed(1)) + ' میلیارد';
  if (t >= 1_000_000) return toFaDigits((t / 1_000_000).toFixed(1)) + ' میلیون';
  if (t >= 1_000) return toFaDigits((t / 1_000).toFixed(0)) + ' هزار';
  return toFaDigits(groupDigits(t));
}

export function percentOff(price, compareAt) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
