/* eslint-disable no-console */
/**
 * راه‌اندازی خودکار پروژه Vesto
 *
 * این اسکریپت فایل `.env` را در صورت نبود می‌سازد و کلیدهای امنیتی را
 * به‌صورت تصادفی و امن تولید می‌کند. روی ویندوز، مک و لینوکس کار می‌کند و
 * نیازی به openssl ندارد.
 *
 * اجرا:  npm run setup
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

const secret = () => crypto.randomBytes(32).toString('hex');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function buildEnv() {
  return `# ---------------------------------------------------------------- دیتابیس
# مسیر فایل SQLite. برای PostgreSQL کافیست provider را در prisma/schema.prisma عوض کنید.
DATABASE_URL="file:./dev.db"

# ------------------------------------------------------------ کلیدهای امنیتی
# این مقادیر به‌صورت خودکار و تصادفی تولید شده‌اند.
# در محیط عملیاتی مقادیر جداگانه‌ای تولید کنید و هرگز آن‌ها را کامیت نکنید.
AUTH_SECRET="${secret()}"
PAYMENT_HMAC_SECRET="${secret()}"

# ------------------------------------------------------------------- آدرس سایت
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# ------------------------------------------------------- تنظیمات اختیاری پنل
ADMIN_PATH_SECRET=""

# ---------------------------------------------------------------- درگاه پرداخت
# کلیدهای زیبال / زرین‌پال / پی‌پینگ از پنل مدیریت
# (تنظیمات ← درگاه پرداخت) وارد می‌شوند و در دیتابیس ذخیره می‌گردند.
`;
}

function main() {
  console.log(`\n${CYAN}▲ راه‌اندازی Vesto${RESET}\n`);

  if (fs.existsSync(ENV_PATH)) {
    const body = fs.readFileSync(ENV_PATH, 'utf8');
    const missing = ['DATABASE_URL', 'AUTH_SECRET', 'PAYMENT_HMAC_SECRET'].filter(
      (k) => !new RegExp(`^\\s*${k}\\s*=\\s*["']?.+`, 'm').test(body)
    );

    if (missing.length) {
      console.log(`${YELLOW}!${RESET} فایل .env هست ولی این کلیدها ناقص‌اند: ${missing.join(', ')}`);
      const additions = missing
        .map((k) => {
          if (k === 'DATABASE_URL') return 'DATABASE_URL="file:./dev.db"';
          return `${k}="${secret()}"`;
        })
        .join('\n');
      fs.appendFileSync(ENV_PATH, `\n# افزوده‌شده توسط npm run setup\n${additions}\n`);
      console.log(`${GREEN}✓${RESET} کلیدهای ناقص به .env اضافه شدند`);
    } else {
      console.log(`${GREEN}✓${RESET} فایل .env از قبل کامل است ${DIM}(دست‌نخورده باقی ماند)${RESET}`);
    }
  } else {
    fs.writeFileSync(ENV_PATH, buildEnv(), 'utf8');
    console.log(`${GREEN}✓${RESET} فایل .env ساخته شد ${DIM}(کلیدها تصادفی تولید شدند)${RESET}`);
  }

  console.log(`\n${DIM}قدم بعدی به‌صورت خودکار اجرا می‌شود: ساخت جداول و داده‌ی نمونه...${RESET}\n`);
}

main();
