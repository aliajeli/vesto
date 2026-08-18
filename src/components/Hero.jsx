'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSettings } from './Providers';
import { Icons, toFa } from './ui';

const SLIDES = [
  {
    title: 'کالکشن پاییز ۱۴۰۴',
    sub: 'دوخت ایتالیایی، پارچه‌ی درجه‌یک، قیمتی که غافلگیرت می‌کند.',
    cta: 'مشاهده کالکشن',
    link: '/shop',
    img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&h=900&fit=crop&auto=format&q=75',
  },
  {
    title: 'تا ۴۰٪ تخفیف ویژه',
    sub: 'فرصت محدود روی منتخب پالتو، بافت و کفش چرم.',
    cta: 'خرید با تخفیف',
    link: '/shop?sale=1',
    img: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&h=900&fit=crop&auto=format&q=75',
  },
  {
    title: 'استایل مینیمال روزمره',
    sub: 'قطعات پایه‌ای که هر روز می‌پوشی و هرگز از مد نمی‌افتند.',
    cta: 'جدیدترین‌ها',
    link: '/shop?sort=newest',
    img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&h=900&fit=crop&auto=format&q=75',
  },
];

export default function Hero({ style = 'full' }) {
  const s = useSettings();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = [
    { ...SLIDES[0], title: s.heroTitle || SLIDES[0].title, sub: s.heroSubtitle || SLIDES[0].sub, cta: s.heroCta || SLIDES[0].cta, link: s.heroCtaLink || SLIDES[0].link, img: s.heroImage || SLIDES[0].img },
    SLIDES[1],
    SLIDES[2],
  ];

  useEffect(() => {
    if (paused || style === 'center') return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [paused, slides.length, style]);

  /* ---------- چیدمان مینیمال (وسط‌چین بدون تصویر) ---------- */
  if (style === 'center') {
    return (
      <section className="container-app py-16 md:py-28 text-center">
        <span className="badge mb-5" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
          <Icons.sparkle size={13} /> {s.tagline}
        </span>
        <h1 className="text-3xl md:text-6xl font-extrabold leading-[1.25] max-w-3xl mx-auto">
          {s.heroTitle || slides[0].title}
        </h1>
        <p className="text-muted mt-5 text-sm md:text-lg max-w-xl mx-auto leading-8">
          {s.heroSubtitle || slides[0].sub}
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href={s.heroCtaLink || '/shop'} className="btn btn-primary btn-lg">
            {s.heroCta || 'مشاهده کالکشن'}
            <Icons.arrowLeft size={17} />
          </Link>
          <Link href="/shop?sale=1" className="btn btn-ghost btn-lg">تخفیف‌ها</Link>
        </div>
      </section>
    );
  }

  /* ---------- چیدمان دو ستونه ---------- */
  if (style === 'split') {
    const sl = slides[0];
    return (
      <section className="container-app py-8 md:py-14">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center">
          <div className="order-2 lg:order-1">
            <span className="badge mb-4" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Icons.sparkle size={13} /> {s.tagline}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.3]">{sl.title}</h1>
            <p className="text-muted mt-4 text-sm md:text-base leading-8 max-w-lg">{sl.sub}</p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link href={sl.link} className="btn btn-primary btn-lg">{sl.cta}<Icons.arrowLeft size={17} /></Link>
              <Link href="/shop?sale=1" className="btn btn-ghost btn-lg">تخفیف‌های ویژه</Link>
            </div>
            <div className="flex gap-6 mt-9">
              {[
                { n: '۲٬۵۰۰+', t: 'سفارش موفق' },
                { n: '۹۸٪', t: 'رضایت مشتری' },
                { n: '۷ روز', t: 'ضمانت بازگشت' },
              ].map((x) => (
                <div key={x.t}>
                  <p className="text-xl md:text-2xl font-extrabold" style={{ color: 'var(--primary)' }}>{x.n}</p>
                  <p className="text-[11px] text-muted mt-0.5">{x.t}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 relative rounded-theme overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sl.img} alt={sl.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.35), transparent 55%)' }} />
          </div>
        </div>
      </section>
    );
  }

  /* ---------- چیدمان تمام‌عرض / اسلایدر ---------- */
  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[62vh] min-h-[420px] max-h-[640px]">
        {slides.map((sl, n) => (
          <div
            key={n}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: n === i ? 1 : 0, pointerEvents: n === i ? 'auto' : 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sl.img}
              alt={sl.title}
              className="w-full h-full object-cover"
              style={{ transform: n === i ? 'scale(1.04)' : 'scale(1)', transition: 'transform 7s linear' }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to left, rgba(0,0,0,.15), rgba(0,0,0,.72))' }}
            />
            <div className="absolute inset-0 flex items-center">
              <div className="container-app">
                <div className="max-w-xl text-white">
                  <span className="badge mb-4" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', backdropFilter: 'blur(6px)' }}>
                    <Icons.sparkle size={13} /> {s.tagline}
                  </span>
                  <h1 className="text-3xl md:text-6xl font-extrabold leading-[1.25] drop-shadow-lg">{sl.title}</h1>
                  <p className="mt-4 text-sm md:text-lg leading-8 opacity-95 drop-shadow max-w-lg">{sl.sub}</p>
                  <div className="flex flex-wrap gap-3 mt-7">
                    <Link href={sl.link} className="btn btn-primary btn-lg">{sl.cta}<Icons.arrowLeft size={17} /></Link>
                    <Link
                      href="/shop"
                      className="btn btn-lg"
                      style={{ background: 'rgba(255,255,255,.14)', color: '#fff', border: '1px solid rgba(255,255,255,.35)', backdropFilter: 'blur(8px)' }}
                    >
                      همه محصولات
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* نشانگرها */}
        <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-2">
          {slides.map((_, n) => (
            <button
              key={n}
              onClick={() => setI(n)}
              aria-label={`اسلاید ${toFa(n + 1)}`}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: n === i ? 30 : 10, background: n === i ? 'var(--primary)' : 'rgba(255,255,255,.55)' }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
