/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();
const T = (t) => t * 10; // تومان → ریال

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const slugify = (s) =>
  s.trim().replace(/\s+/g, '-').replace(/[^\u0600-\u06FF\w-]/g, '').toLowerCase();

const IMG = (seed, w = 900, h = 1200) =>
  `https://images.unsplash.com/photo-${seed}?w=${w}&h=${h}&fit=crop&auto=format&q=70`;

// مجموعه‌ای از عکس‌های واقعی پوشاک (Unsplash)
const PHOTOS = {
  mensShirt: ['1602810318383-e386cc2a3ccf', '1596755094514-f87e34085b2c', '1620012253295-c15cc3e65df4'],
  mensJacket: ['1591047139829-d91aecb6caea', '1551028719-00167b16eac5', '1544022613-e87ca75a784a'],
  mensPants: ['1473966968600-fa801b869a1a', '1624378439575-d8705ad7ae80', '1594633312681-425c7b97ccd1'],
  womenDress: ['1595777457583-95e059d581b8', '1572804013309-59a88b7e92f1', '1566174053879-31528523f8ae'],
  womenTop: ['1564257631407-4deb1f99d992', '1485231183945-fffde7cc051e', '1554568218-0f1715e72254'],
  womenCoat: ['1539533018447-63fcce2678e3', '1591047139829-d91aecb6caea', '1520975954732-35dd22299614'],
  shoes: ['1549298916-b41d501d3772', '1595950653106-6c9ebd614d3a', '1600269452121-4f2416e55c28'],
  bag: ['1584917865442-de89df76afd3', '1548036328-c9fa89d128fa', '1590874103328-eac38a683ce7'],
  knit: ['1576871337622-98d48d1cf531', '1620799140408-edc6dcb6d633', '1434389677669-e08b4cac3105'],
  accessory: ['1591561954557-26941169b49e', '1611085583191-a3b181a88401', '1523206489230-c012c64b2b48'],
};

const CATEGORIES = [
  { name: 'مردانه', slug: 'men', icon: '👔', description: 'پوشاک مردانه؛ از کژوال تا رسمی' },
  { name: 'زنانه', slug: 'women', icon: '👗', description: 'پوشاک زنانه با طراحی روز' },
  { name: 'کفش', slug: 'shoes', icon: '👟', description: 'کفش‌های راحت و شیک' },
  { name: 'کیف و اکسسوری', slug: 'accessories', icon: '👜', description: 'مکمل استایل شما' },
  { name: 'بافت و پلیور', slug: 'knitwear', icon: '🧶', description: 'گرم و سبک برای فصل سرد' },
  { name: 'کالکشن ویژه', slug: 'special', icon: '✨', description: 'محصولات محدود و ویژه' },
];

const SUBCATS = [
  { name: 'پیراهن مردانه', slug: 'men-shirts', parent: 'men' },
  { name: 'کت و سویشرت', slug: 'men-jackets', parent: 'men' },
  { name: 'شلوار مردانه', slug: 'men-pants', parent: 'men' },
  { name: 'مانتو و پالتو', slug: 'women-coats', parent: 'women' },
  { name: 'پیراهن و سارافون', slug: 'women-dresses', parent: 'women' },
  { name: 'بلوز و شومیز', slug: 'women-tops', parent: 'women' },
];

const BRANDS = ['Vesto Studio', 'Milano Filo', 'Nordwear', 'Atelier 79', 'Saye', 'Kavir Denim'];

const MATERIALS = ['۱۰۰٪ پنبه', 'پنبه/پلی‌استر ۶۵-۳۵', 'کتان طبیعی', 'پشم مرینوس', 'ویسکوز', 'جین ۱۲ اونس', 'چرم طبیعی'];
const CARE = [
  'شست‌وشو با آب سرد، اتوی ملایم، خشک‌شویی مجاز',
  'شست‌وشوی دستی توصیه می‌شود؛ از سفیدکننده استفاده نکنید',
  'قابل شست‌وشو در ماشین لباسشویی با برنامه ظریف',
];

const MEN_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const WOMEN_SIZES = ['36', '38', '40', '42', '44'];
const SHOE_SIZES = ['40', '41', '42', '43', '44'];
const COLORS = [
  { color: 'مشکی', hex: '#111111' },
  { color: 'سرمه‌ای', hex: '#1e2a44' },
  { color: 'کرم', hex: '#e8dcc8' },
  { color: 'زیتونی', hex: '#5a6448' },
  { color: 'طوسی', hex: '#8a8f98' },
  { color: 'شرابی', hex: '#6d2136' },
  { color: 'سفید', hex: '#f7f7f5' },
  { color: 'قهوه‌ای', hex: '#5b3b23' },
];

const PRODUCTS = [
  { name: 'پیراهن آستین بلند کتان مردانه مدل میلانو', cat: 'men-shirts', photos: PHOTOS.mensShirt, price: 1_290_000, compare: 1_890_000, sizes: MEN_SIZES, tags: ['کژوال', 'کتان', 'پرفروش'] },
  { name: 'پیراهن آکسفورد کلاسیک مردانه', cat: 'men-shirts', photos: PHOTOS.mensShirt, price: 1_580_000, compare: null, sizes: MEN_SIZES, tags: ['رسمی', 'آکسفورد'] },
  { name: 'کت تک اسپرت مردانه پشمی', cat: 'men-jackets', photos: PHOTOS.mensJacket, price: 4_950_000, compare: 6_400_000, sizes: MEN_SIZES, tags: ['رسمی', 'پشم', 'ویژه'] },
  { name: 'سویشرت هودی اورسایز وستو', cat: 'men-jackets', photos: PHOTOS.mensJacket, price: 1_690_000, compare: 2_190_000, sizes: MEN_SIZES, tags: ['اورسایز', 'کژوال'] },
  { name: 'شلوار جین راسته کویر دنیم', cat: 'men-pants', photos: PHOTOS.mensPants, price: 2_150_000, compare: null, sizes: MEN_SIZES, tags: ['جین', 'راسته'] },
  { name: 'شلوار پارچه‌ای فاق بلند مردانه', cat: 'men-pants', photos: PHOTOS.mensPants, price: 1_780_000, compare: 2_250_000, sizes: MEN_SIZES, tags: ['رسمی'] },
  { name: 'مانتو بلند جلوباز کرپ', cat: 'women-coats', photos: PHOTOS.womenCoat, price: 2_890_000, compare: 3_700_000, sizes: WOMEN_SIZES, tags: ['مانتو', 'پرفروش'] },
  { name: 'پالتو بلند پشمی زنانه مدل نورد', cat: 'women-coats', photos: PHOTOS.womenCoat, price: 6_450_000, compare: 8_200_000, sizes: WOMEN_SIZES, tags: ['پالتو', 'زمستانی', 'ویژه'] },
  { name: 'پیراهن ماکسی گلدار ویسکوز', cat: 'women-dresses', photos: PHOTOS.womenDress, price: 2_390_000, compare: null, sizes: WOMEN_SIZES, tags: ['ماکسی', 'تابستانی'] },
  { name: 'سارافون جین زنانه', cat: 'women-dresses', photos: PHOTOS.womenDress, price: 1_950_000, compare: 2_600_000, sizes: WOMEN_SIZES, tags: ['جین'] },
  { name: 'شومیز ساتن آستین پفی', cat: 'women-tops', photos: PHOTOS.womenTop, price: 1_450_000, compare: 1_890_000, sizes: WOMEN_SIZES, tags: ['ساتن', 'مجلسی'] },
  { name: 'بلوز کراپ نخی زنانه', cat: 'women-tops', photos: PHOTOS.womenTop, price: 890_000, compare: null, sizes: WOMEN_SIZES, tags: ['کژوال', 'نخی'] },
  { name: 'کتانی روزمره چرم طبیعی', cat: 'shoes', photos: PHOTOS.shoes, price: 3_290_000, compare: 4_100_000, sizes: SHOE_SIZES, tags: ['چرم', 'پرفروش'] },
  { name: 'کفش رسمی مردانه دست‌دوز', cat: 'shoes', photos: PHOTOS.shoes, price: 4_650_000, compare: null, sizes: SHOE_SIZES, tags: ['رسمی', 'چرم'] },
  { name: 'کیف دوشی چرم زنانه', cat: 'accessories', photos: PHOTOS.bag, price: 2_750_000, compare: 3_450_000, sizes: ['تک‌سایز'], tags: ['چرم', 'ویژه'] },
  { name: 'کمربند چرم طبیعی', cat: 'accessories', photos: PHOTOS.accessory, price: 690_000, compare: 950_000, sizes: ['۹۰', '۱۰۰', '۱۱۰'], tags: ['چرم'] },
  { name: 'شال نخی طرح‌دار', cat: 'accessories', photos: PHOTOS.accessory, price: 490_000, compare: null, sizes: ['تک‌سایز'], tags: ['نخی'] },
  { name: 'پلیور بافت یقه گرد مرینوس', cat: 'knitwear', photos: PHOTOS.knit, price: 2_190_000, compare: 2_890_000, sizes: MEN_SIZES, tags: ['پشم', 'زمستانی'] },
  { name: 'ژاکت بافت جلوباز زنانه', cat: 'knitwear', photos: PHOTOS.knit, price: 1_890_000, compare: null, sizes: WOMEN_SIZES, tags: ['بافت'] },
  { name: 'بافت یقه اسکی اورسایز', cat: 'knitwear', photos: PHOTOS.knit, price: 1_690_000, compare: 2_290_000, sizes: MEN_SIZES, tags: ['اورسایز', 'زمستانی'] },
  { name: 'ست کالکشن محدود وستو ۱۴۰۴', cat: 'special', photos: PHOTOS.mensJacket, price: 8_900_000, compare: 12_000_000, sizes: MEN_SIZES, tags: ['محدود', 'ویژه', 'لوکس'] },
  { name: 'کت بلند کشمیر لیمیتد ادیشن', cat: 'special', photos: PHOTOS.womenCoat, price: 11_500_000, compare: 14_900_000, sizes: WOMEN_SIZES, tags: ['کشمیر', 'محدود'] },
];

async function reset() {
  const tables = [
    'ledgerEntry', 'payment', 'orderItem', 'order', 'review', 'wishlistItem',
    'productVariant', 'product', 'brand', 'category', 'coupon', 'address',
    'session', 'auditLog', 'expense', 'rateLimit', 'newsletter', 'setting', 'user',
  ];
  for (const t of tables) {
    await prisma[t].deleteMany({}).catch(() => {});
  }
}

async function main() {
  console.log('⏳ پاک‌سازی دیتابیس...');
  await reset();

  // ---------------------------------------------------------- کاربران
  console.log('👤 ساخت کاربران...');
  const adminPass = await bcrypt.hash('Vesto@2024', 12);
  const admin = await prisma.user.create({
    data: {
      name: 'مدیر وستو',
      email: 'admin@vesto.ir',
      phone: '09120000000',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  });

  const customerPass = await bcrypt.hash('Test@1234', 12);
  const names = ['سارا محمدی', 'علی رضایی', 'نگار حسینی', 'محمد کریمی', 'مریم اسدی', 'رضا نوری', 'الهام صادقی', 'امیر جعفری', 'زهرا موسوی', 'حسین اکبری', 'فاطمه یزدانی', 'پویا شریفی'];
  const customers = [];
  for (let i = 0; i < names.length; i++) {
    const u = await prisma.user.create({
      data: {
        name: names[i],
        email: `user${i + 1}@example.com`,
        phone: `0912000${String(i + 1).padStart(4, '0')}`,
        passwordHash: customerPass,
        role: 'CUSTOMER',
        createdAt: new Date(Date.now() - rnd(30, 400) * 864e5),
      },
    });
    customers.push(u);
    await prisma.address.create({
      data: {
        userId: u.id,
        fullName: u.name,
        phone: u.phone,
        province: pick(['تهران', 'اصفهان', 'فارس', 'خراسان رضوی', 'گیلان', 'البرز']),
        city: pick(['تهران', 'اصفهان', 'شیراز', 'مشهد', 'رشت', 'کرج']),
        postalCode: String(rnd(1000000000, 9999999999)),
        line1: `خیابان ${pick(['ولیعصر', 'انقلاب', 'آزادی', 'شریعتی', 'میرداماد'])}، کوچه ${rnd(1, 40)}، پلاک ${rnd(1, 200)}`,
        isDefault: true,
      },
    });
  }

  // ---------------------------------------------------------- دسته‌بندی و برند
  console.log('🗂  دسته‌بندی‌ها و برندها...');
  const catMap = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    catMap[c.slug] = await prisma.category.create({
      data: { ...c, sortOrder: i, image: IMG(pick(PHOTOS.womenTop), 600, 600) },
    });
  }
  for (let i = 0; i < SUBCATS.length; i++) {
    const s = SUBCATS[i];
    catMap[s.slug] = await prisma.category.create({
      data: {
        name: s.name,
        slug: s.slug,
        parentId: catMap[s.parent].id,
        sortOrder: i,
      },
    });
  }

  const brandMap = {};
  for (const b of BRANDS) {
    brandMap[b] = await prisma.brand.create({
      data: { name: b, slug: slugify(b.replace(/\s/g, '-')) },
    });
  }

  // ---------------------------------------------------------- محصولات
  console.log('👕 محصولات و تنوع‌ها...');
  const products = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const priceR = T(p.price);
    const compareR = p.compare ? T(p.compare) : null;
    const images = p.photos.map((s) => IMG(s));
    const brand = pick(BRANDS);

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: `${slugify(p.name).slice(0, 40)}-${i + 1}`,
        description: `${p.name} از کالکشن ${brand}.\n\nاین محصول با دقت از ${pick(MATERIALS)} تولید شده و برای استفاده‌ی روزمره و مجالس نیمه‌رسمی مناسب است. دوخت تمیز، فرم‌گیری عالی و ماندگاری رنگ از ویژگی‌های شاخص آن است.\n\nراهنمای انتخاب سایز در صفحه‌ی محصول موجود است؛ در صورت تردید بین دو سایز، سایز بزرگ‌تر را انتخاب کنید.`,
        shortDesc: `${pick(MATERIALS)} • دوخت درجه‌یک • ارسال سریع`,
        price: priceR,
        compareAtPrice: compareR,
        costPrice: Math.round(priceR * (0.52 + Math.random() * 0.16)),
        sku: `VS-${String(1000 + i)}`,
        categoryId: catMap[p.cat].id,
        brandId: brandMap[brand].id,
        images: JSON.stringify(images),
        tags: JSON.stringify(p.tags),
        material: pick(MATERIALS),
        careGuide: pick(CARE),
        origin: pick(['ایران', 'ترکیه', 'ایتالیا']),
        weightGram: rnd(200, 1400),
        isFeatured: i % 4 === 0,
        isNew: i >= PRODUCTS.length - 6,
        seoTitle: `خرید ${p.name} | وستو`,
        seoDescription: `${p.name} با بهترین قیمت و ضمانت اصالت کالا از فروشگاه وستو.`,
        createdAt: new Date(Date.now() - rnd(1, 300) * 864e5),
      },
    });

    const colorSet = COLORS.slice(0, rnd(2, 4));
    for (const size of p.sizes) {
      for (const c of colorSet) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            size,
            color: c.color,
            colorHex: c.hex,
            stock: rnd(0, 26),
            sku: `VS-${1000 + i}-${size}-${c.color.slice(0, 2)}`,
          },
        });
      }
    }
    products.push(await prisma.product.findUnique({ where: { id: product.id }, include: { variants: true } }));
  }

  // ---------------------------------------------------------- کدهای تخفیف
  console.log('🎟  کدهای تخفیف...');
  await prisma.coupon.createMany({
    data: [
      { code: 'VESTO10', type: 'PERCENT', value: 10, minSubtotal: T(1_000_000), maxDiscount: T(500_000), usageLimit: 1000, perUserLimit: 1, description: 'تخفیف ۱۰٪ خوش‌آمدگویی', isActive: true },
      { code: 'WELCOME20', type: 'PERCENT', value: 20, minSubtotal: T(3_000_000), maxDiscount: T(1_500_000), usageLimit: 300, perUserLimit: 1, description: 'تخفیف ۲۰٪ اولین خرید', isActive: true },
      { code: 'FIX200', type: 'FIXED', value: T(200_000), minSubtotal: T(1_500_000), usageLimit: 500, perUserLimit: 2, description: '۲۰۰ هزار تومان تخفیف نقدی', isActive: true },
      { code: 'AUTUMN15', type: 'PERCENT', value: 15, minSubtotal: T(2_000_000), maxDiscount: T(900_000), usageLimit: 200, perUserLimit: 1, description: 'جشنواره پاییزه', isActive: true, endsAt: new Date(Date.now() + 60 * 864e5) },
      { code: 'EXPIRED5', type: 'PERCENT', value: 5, minSubtotal: 0, usageLimit: 50, perUserLimit: 1, description: 'کد منقضی‌شده (نمونه)', isActive: false, endsAt: new Date(Date.now() - 10 * 864e5) },
    ],
  });

  // ---------------------------------------------------------- سفارش‌ها (۱۴ ماه گذشته)
  console.log('🧾 تولید سفارش‌های تاریخی (۱۴ ماه)...');
  const gateways = ['zibal', 'zarinpal', 'payping', 'sandbox'];
  const statuses = ['PAID', 'PAID', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'CANCELLED', 'PENDING'];
  const DAYS = 425;
  let orderSeq = 0;
  const ledgerBatch = [];

  for (let d = DAYS; d >= 0; d--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - d);

    const month = day.getMonth();
    const dow = day.getDay();
    // فصلی‌بودن: پاییز/زمستان پرفروش‌تر
    const seasonal = [1.0, 0.9, 0.85, 0.9, 1.0, 1.15, 1.25, 1.35, 1.3, 1.15, 1.05, 1.0][month];
    // رشد تدریجی کسب‌وکار
    const growth = 0.6 + (DAYS - d) / DAYS * 0.9;
    // آخر هفته (پنجشنبه/جمعه) شلوغ‌تر
    const weekend = dow === 4 || dow === 5 ? 1.3 : 1;
    const base = 5 * seasonal * growth * weekend;
    const count = Math.max(0, Math.round(base + (Math.random() * 4 - 2)));

    for (let n = 0; n < count; n++) {
      orderSeq++;
      // توزیع ساعتی واقع‌گرایانه: اوج ۱۲ و ۲۱
      const hourWeights = [1,1,1,1,1,2,3,5,8,11,14,16,18,15,13,12,14,17,20,24,26,22,14,6];
      const total = hourWeights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let hour = 0;
      for (let h = 0; h < 24; h++) { r -= hourWeights[h]; if (r <= 0) { hour = h; break; } }
      const createdAt = new Date(day);
      createdAt.setHours(hour, rnd(0, 59), rnd(0, 59), 0);

      const status = pick(statuses);
      const user = Math.random() < 0.82 ? pick(customers) : null;
      const itemCount = rnd(1, 3);
      const chosen = [];
      for (let k = 0; k < itemCount; k++) {
        const p = pick(products);
        if (chosen.find((c) => c.p.id === p.id)) continue;
        chosen.push({ p, v: p.variants.length ? pick(p.variants) : null, q: rnd(1, 2) });
      }
      if (!chosen.length) continue;

      let subtotal = 0, costTotal = 0;
      const itemsData = chosen.map(({ p, v, q }) => {
        const unit = p.price + (v?.priceDiff || 0);
        subtotal += unit * q;
        costTotal += (p.costPrice || 0) * q;
        let img = null;
        try { img = JSON.parse(p.images)[0] || null; } catch {}
        return {
          productId: p.id,
          nameSnap: p.name,
          imageSnap: img,
          size: v?.size || null,
          color: v?.color || null,
          unitPrice: unit,
          costPrice: p.costPrice || 0,
          quantity: q,
          lineTotal: unit * q,
        };
      });

      const useCoupon = Math.random() < 0.28;
      const couponCode = useCoupon ? pick(['VESTO10', 'WELCOME20', 'FIX200', 'AUTUMN15']) : null;
      let discountTotal = 0;
      if (couponCode === 'VESTO10') discountTotal = Math.min(Math.round(subtotal * 0.1), T(500_000));
      else if (couponCode === 'WELCOME20') discountTotal = Math.min(Math.round(subtotal * 0.2), T(1_500_000));
      else if (couponCode === 'FIX200') discountTotal = Math.min(T(200_000), subtotal);
      else if (couponCode === 'AUTUMN15') discountTotal = Math.min(Math.round(subtotal * 0.15), T(900_000));

      const taxable = subtotal - discountTotal;
      const taxTotal = Math.round(taxable * 0.09);
      const shippingTotal = taxable >= T(2_000_000) ? 0 : T(49_000);
      const grandTotal = taxable + taxTotal + shippingTotal;
      const paid = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status);

      const stamp = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}`;
      const order = await prisma.order.create({
        data: {
          orderNumber: `VS-${stamp}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          userId: user?.id || null,
          guestName: user ? null : 'مهمان وستو',
          guestPhone: user ? null : `0912${rnd(1000000, 9999999)}`,
          guestAddress: user ? null : 'تهران، خیابان آزادی',
          status,
          subtotal, discountTotal, shippingTotal, taxTotal, grandTotal, costTotal,
          couponCode,
          shippingMethod: pick(['standard', 'express']),
          trackingCode: ['SHIPPED', 'DELIVERED'].includes(status) ? String(rnd(10000000000, 99999999999)) : null,
          paidAt: paid ? createdAt : null,
          createdAt,
          updatedAt: createdAt,
          items: { create: itemsData },
        },
      });

      if (paid) {
        const gw = pick(gateways);
        await prisma.payment.create({
          data: {
            orderId: order.id,
            gateway: gw,
            amount: grandTotal,
            status: 'SUCCESS',
            authority: `${gw.toUpperCase()}-${crypto.randomBytes(5).toString('hex')}`,
            refId: String(rnd(100000000, 999999999)),
            cardPan: `6037-****-****-${rnd(1000, 9999)}`,
            verifiedAt: createdAt,
            createdAt,
            updatedAt: createdAt,
          },
        });

        ledgerBatch.push(
          { date: createdAt, type: 'REVENUE', account: 'بانک / درگاه پرداخت', debit: grandTotal, credit: 0, amount: grandTotal, refType: 'ORDER', refId: order.id, description: `دریافت وجه ${order.orderNumber}` },
          { date: createdAt, type: 'REVENUE', account: 'فروش کالا', debit: 0, credit: subtotal, amount: subtotal, refType: 'ORDER', refId: order.id },
          { date: createdAt, type: 'COGS', account: 'بهای تمام‌شده کالای فروش‌رفته', debit: costTotal, credit: 0, amount: costTotal, refType: 'ORDER', refId: order.id },
          { date: createdAt, type: 'COGS', account: 'موجودی کالا', debit: 0, credit: costTotal, amount: costTotal, refType: 'ORDER', refId: order.id },
        );
        if (discountTotal) ledgerBatch.push({ date: createdAt, type: 'DISCOUNT', account: 'تخفیفات فروش', debit: discountTotal, credit: 0, amount: discountTotal, refType: 'ORDER', refId: order.id });
        if (taxTotal) ledgerBatch.push({ date: createdAt, type: 'TAX', account: 'مالیات بر ارزش افزوده پرداختنی', debit: 0, credit: taxTotal, amount: taxTotal, refType: 'ORDER', refId: order.id });
        if (shippingTotal) ledgerBatch.push({ date: createdAt, type: 'SHIPPING', account: 'درآمد حمل و نقل', debit: 0, credit: shippingTotal, amount: shippingTotal, refType: 'ORDER', refId: order.id });
      } else if (status === 'CANCELLED' && Math.random() < 0.5) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            gateway: pick(gateways),
            amount: grandTotal,
            status: 'FAILED',
            failReason: pick(['انصراف کاربر', 'موجودی ناکافی', 'خطای بانک']),
            createdAt, updatedAt: createdAt,
          },
        });
      }
    }
    if (d % 60 === 0) console.log(`   … ${DAYS - d}/${DAYS} روز`);
  }

  console.log(`📒 ثبت ${ledgerBatch.length} سند حسابداری...`);
  for (let i = 0; i < ledgerBatch.length; i += 500) {
    await prisma.ledgerEntry.createMany({ data: ledgerBatch.slice(i, i + 500) });
  }

  // ---------------------------------------------------------- به‌روزرسانی آمار محصول
  console.log('📊 محاسبه آمار محصولات...');
  for (const p of products) {
    const agg = await prisma.orderItem.aggregate({
      where: { productId: p.id, order: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } },
      _sum: { quantity: true },
    });
    await prisma.product.update({
      where: { id: p.id },
      data: { soldCount: agg._sum.quantity || 0, viewCount: rnd(100, 9000) },
    });
  }

  // ---------------------------------------------------------- نظرات
  console.log('⭐ نظرات کاربران...');
  const bodies = [
    'کیفیت پارچه واقعاً عالیه، دقیقاً همون چیزی که تو عکس بود.',
    'سایزش کمی بزرگ‌تر از حد معموله، یک سایز کوچیک‌تر بگیرید.',
    'ارسال خیلی سریع بود، بسته‌بندی هم مرتب. ممنون از وستو.',
    'دوختش تمیزه ولی رنگش یه‌کم تیره‌تر از عکسه.',
    'برای قیمتش فوق‌العاده‌ست. حتماً دوباره خرید می‌کنم.',
    'راحته و فرمش عالیه، برای استفاده روزمره پیشنهاد می‌کنم.',
  ];
  for (const p of products) {
    const n = rnd(2, 9);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const rating = rnd(3, 5);
      sum += rating;
      await prisma.review.create({
        data: {
          productId: p.id,
          userId: pick(customers).id,
          rating,
          title: pick(['عالی بود', 'راضی‌ام', 'ارزش خرید داره', 'خوب ولی...', 'پیشنهاد می‌کنم']),
          body: pick(bodies),
          isApproved: Math.random() < 0.85,
          createdAt: new Date(Date.now() - rnd(1, 200) * 864e5),
        },
      });
    }
    await prisma.product.update({
      where: { id: p.id },
      data: { ratingAvg: Math.round((sum / n) * 10) / 10, ratingCount: n },
    });
  }

  // ---------------------------------------------------------- هزینه‌ها
  console.log('💸 هزینه‌های عملیاتی...');
  const expenseTypes = [
    { title: 'اجاره انبار', category: 'RENT', amount: T(45_000_000) },
    { title: 'حقوق و دستمزد', category: 'PAYROLL', amount: T(180_000_000) },
    { title: 'تبلیغات دیجیتال', category: 'MARKETING', amount: T(35_000_000) },
    { title: 'هزینه بسته‌بندی', category: 'OPERATING', amount: T(12_000_000) },
    { title: 'سرویس‌های ابری و نرم‌افزار', category: 'IT', amount: T(8_000_000) },
  ];
  for (let m = 13; m >= 0; m--) {
    const d = new Date();
    d.setMonth(d.getMonth() - m, 5);
    for (const e of expenseTypes) {
      await prisma.expense.create({
        data: {
          title: e.title,
          category: e.category,
          amount: Math.round(e.amount * (0.85 + Math.random() * 0.3)),
          date: d,
          note: 'هزینه ماهانه',
        },
      });
    }
  }

  // ---------------------------------------------------------- لاگ حسابرسی
  console.log('🛡  لاگ‌های حسابرسی...');
  const auditActions = [
    { action: 'ورود موفق مدیر', severity: 'INFO', entity: 'User' },
    { action: 'تلاش ناموفق برای ورود', severity: 'WARN', entity: 'Auth' },
    { action: 'ویرایش محصول', severity: 'INFO', entity: 'Product' },
    { action: 'تغییر تنظیمات درگاه پرداخت', severity: 'CRITICAL', entity: 'Setting' },
    { action: 'حذف کد تخفیف', severity: 'WARN', entity: 'Coupon' },
    { action: 'تأیید پرداخت سفارش', severity: 'INFO', entity: 'Payment' },
    { action: 'تغییر تم سایت', severity: 'INFO', entity: 'Setting' },
    { action: 'مسدودسازی بر اثر تلاش مکرر ورود', severity: 'CRITICAL', entity: 'Auth' },
  ];
  for (let i = 0; i < 90; i++) {
    const a = pick(auditActions);
    await prisma.auditLog.create({
      data: {
        userId: Math.random() < 0.7 ? admin.id : null,
        actorName: Math.random() < 0.7 ? admin.name : 'ناشناس',
        action: a.action,
        entity: a.entity,
        severity: a.severity,
        ip: `${rnd(2, 220)}.${rnd(0, 255)}.${rnd(0, 255)}.${rnd(1, 254)}`,
        userAgent: pick(['Mozilla/5.0 (Windows NT 10.0)', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'Mozilla/5.0 (Macintosh)']),
        createdAt: new Date(Date.now() - rnd(0, 60) * 864e5 - rnd(0, 86400) * 1000),
      },
    });
  }

  // ---------------------------------------------------------- تنظیمات
  console.log('⚙️  تنظیمات پیش‌فرض...');
  const settings = {
    storeName: 'Vesto',
    storeNameFa: 'وستو',
    tagline: 'پوشاک مدرن، دوخت ماندگار',
    theme: 'midnight',
    layout: 'editorial',
    activeGateway: 'sandbox',
    gatewaySandbox: true,
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.create({ data: { key, value: JSON.stringify(value) } });
  }

  await prisma.newsletter.createMany({
    data: Array.from({ length: 24 }, (_, i) => ({ email: `sub${i + 1}@example.com` })),
  });

  const counts = {
    محصولات: await prisma.product.count(),
    تنوع: await prisma.productVariant.count(),
    سفارش: await prisma.order.count(),
    پرداخت: await prisma.payment.count(),
    'اسناد مالی': await prisma.ledgerEntry.count(),
    کاربران: await prisma.user.count(),
    نظرات: await prisma.review.count(),
  };
  console.log('\n✅ داده‌های نمونه ساخته شد:', counts);
  console.log('\n🔑 ورود مدیر:  admin@vesto.ir  /  Vesto@2024');
  console.log('🔑 ورود مشتری: user1@example.com / Test@1234\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
