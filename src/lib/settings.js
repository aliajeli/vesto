import 'server-only';
import prisma from './db';

export const DEFAULT_SETTINGS = {
  // هویت فروشگاه
  storeName: 'Vesto',
  storeNameFa: 'وستو',
  tagline: 'پوشاک مدرن، دوخت ماندگار',
  description: 'فروشگاه آنلاین پوشاک وستو — انتخابی از بهترین برندها با ارسال سریع به سراسر ایران.',
  logoText: 'VESTO',
  logoImage: '',
  favicon: '',

  // ظاهر
  theme: 'midnight',
  layout: 'editorial',
  font: 'vazir',
  radius: '',
  showAnnouncementBar: true,
  announcementText: 'ارسال رایگان برای سفارش‌های بالای ۲٬۰۰۰٬۰۰۰ تومان — کد تخفیف: VESTO10',
  heroTitle: 'کالکشن پاییز ۱۴۰۴',
  heroSubtitle: 'دوخت ایتالیایی، پارچه‌ی درجه‌یک، قیمتی که غافلگیرت می‌کند.',
  heroCta: 'مشاهده‌ی کالکشن',
  heroCtaLink: '/shop',
  heroImage: '',

  // فروشگاه
  currencySuffix: 'تومان',
  taxPercent: 9,
  shippingFlat: 490000, // ریال
  freeShippingThreshold: 20000000, // ریال
  lowStockThreshold: 5,
  allowGuestCheckout: true,
  maxQtyPerItem: 10,

  // تماس
  phone: '۰۲۱-۹۱۰۰۲۰۳۰',
  email: 'support@vesto.example',
  address: 'تهران، خیابان ولیعصر، پلاک ۱۲۰۰',
  instagram: 'https://instagram.com/vesto',
  telegram: '',
  whatsapp: '',

  // درگاه پرداخت
  activeGateway: 'sandbox', // sandbox | zibal | zarinpal | payping
  zibalMerchant: '',
  zarinpalMerchant: '',
  paypingToken: '',
  gatewaySandbox: true,

  // امنیت
  adminPathSecret: '',
  maintenanceMode: false,
  maintenanceMessage: 'فروشگاه موقتاً در حال به‌روزرسانی است. به‌زودی برمی‌گردیم.',

  // متن‌های ثابت
  footerAbout: 'وستو از سال ۱۳۹۸ در کنار شماست؛ با ضمانت اصالت کالا و ۷ روز مهلت بازگشت.',
  returnPolicy: 'امکان بازگشت کالا تا ۷ روز پس از تحویل، در صورت عدم استفاده و سالم بودن برچسب‌ها.',
  shippingPolicy: 'ارسال به تهران ۱ تا ۲ روز کاری و شهرستان‌ها ۲ تا ۴ روز کاری از طریق پست پیشتاز.',
};

// کلیدهایی که هرگز نباید به کلاینت برسند
export const SECRET_KEYS = new Set([
  'zibalMerchant',
  'zarinpalMerchant',
  'paypingToken',
  'adminPathSecret',
]);

let cache = null;
let cacheAt = 0;
const TTL = 5_000;

export async function getSettings({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < TTL) return cache;
  let rows = [];
  try {
    rows = await prisma.setting.findMany();
  } catch {
    rows = [];
  }
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      out[r.key] = r.value;
    }
  }
  cache = out;
  cacheAt = Date.now();
  return out;
}

/** نسخه‌ی امن برای ارسال به کامپوننت‌های کلاینت */
export async function getPublicSettings() {
  const s = await getSettings();
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (!SECRET_KEYS.has(k)) out[k] = v;
  }
  out.hasZibal = !!s.zibalMerchant;
  out.hasZarinpal = !!s.zarinpalMerchant;
  out.hasPayping = !!s.paypingToken;
  return out;
}

export async function setSettings(patch) {
  const entries = Object.entries(patch);
  for (const [key, value] of entries) {
    const v = JSON.stringify(value);
    await prisma.setting.upsert({
      where: { key },
      update: { value: v },
      create: { key, value: v },
    });
  }
  cache = null;
  return getSettings({ fresh: true });
}

export function invalidateSettingsCache() {
  cache = null;
}
