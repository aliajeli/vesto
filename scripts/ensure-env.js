/* eslint-disable no-console */
/**
 * محافظ پیش از اجرای dev.
 *
 * اگر `.env` یا دیتابیس آماده نباشد، به‌جای خطای مبهم Prisma
 * («Environment variable not found: DATABASE_URL») یک پیام روشن فارسی
 * نشان می‌دهد و دقیقاً می‌گوید چه دستوری را اجرا کنید.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function die(title, lines) {
  console.error(`\n${RED}${BOLD}✖ ${title}${RESET}\n`);
  lines.forEach((l) => console.error('  ' + l));
  console.error('');
  process.exit(1);
}

// ۱) وجود فایل .env
const envPath = path.join(ROOT, '.env');
if (!fs.existsSync(envPath)) {
  die('فایل .env پیدا نشد', [
    'این فایل حاوی کلیدهای محرمانه است و عمداً در گیت نگهداری نمی‌شود.',
    '',
    `برای ساخت خودکار آن به‌همراه دیتابیس و داده‌ی نمونه، اجرا کنید:`,
    '',
    `    ${CYAN}${BOLD}npm run setup${RESET}`,
    '',
  ]);
}

// ۲) وجود DATABASE_URL داخل .env
const body = fs.readFileSync(envPath, 'utf8');
const match = body.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m);
if (!match) {
  die('متغیر DATABASE_URL در فایل .env تعریف نشده است', [
    'برای تکمیل خودکار فایل .env اجرا کنید:',
    '',
    `    ${CYAN}${BOLD}npm run setup${RESET}`,
    '',
  ]);
}

// ۳) اگر SQLite است، وجود و غیرخالی بودن فایل دیتابیس را چک کن
const url = match[1].trim();
if (url.startsWith('file:')) {
  const rel = url.slice('file:'.length);
  const dbPath = path.resolve(ROOT, 'prisma', rel);
  const ok = fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0;
  if (!ok) {
    console.error(`\n${YELLOW}${BOLD}! دیتابیس هنوز ساخته نشده است${RESET}\n`);
    console.error('  برای ساخت جداول و افزودن داده‌ی نمونه اجرا کنید:\n');
    console.error(`      ${CYAN}${BOLD}npm run setup${RESET}\n`);
    process.exit(1);
  }
}
