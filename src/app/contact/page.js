import Shell from '@/components/Shell';
import { getPublicSettings } from '@/lib/settings';
import { Icons } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'تماس با ما' };

export default async function ContactPage() {
  const s = await getPublicSettings();

  const items = [
    { icon: Icons.phone, label: 'تلفن پشتیبانی', value: s.phone, href: `tel:${s.phone}` },
    { icon: Icons.mail, label: 'ایمیل', value: s.email, href: `mailto:${s.email}` },
    { icon: Icons.pin, label: 'نشانی', value: s.address },
    { icon: Icons.instagram, label: 'اینستاگرام', value: '@vesto', href: s.instagram },
  ].filter((i) => i.value);

  const faqs = [
    { q: 'چه مدت طول می‌کشد سفارشم برسد؟', a: s.shippingPolicy },
    { q: 'شرایط بازگشت کالا چیست؟', a: s.returnPolicy },
    { q: 'آیا پرداخت در محل دارید؟', a: 'در حال حاضر پرداخت فقط به‌صورت آنلاین و از طریق درگاه‌های معتبر بانکی (زیبال، زرین‌پال و پی‌پینگ) انجام می‌شود.' },
    { q: 'چطور از اصل بودن کالا مطمئن شوم؟', a: 'تمام محصولات وستو دارای برچسب اصالت و ضمانت بازگشت وجه در صورت مغایرت هستند.' },
    { q: 'اگر سایز مناسب نبود چه کنم؟', a: 'تا ۷ روز پس از تحویل می‌توانید درخواست تعویض سایز ثبت کنید؛ کالا باید بدون استفاده و با برچسب سالم باشد.' },
  ];

  return (
    <Shell>
      <div className="container-app py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-extrabold">تماس با {s.storeNameFa || s.storeName}</h1>
            <p className="text-sm text-muted mt-2.5 leading-7 max-w-lg mx-auto">
              تیم پشتیبانی وستو شنبه تا پنجشنبه از ساعت ۹ تا ۱۸ پاسخگوی شماست.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-10">
            {items.map((it) => {
              const Inner = (
                <>
                  <span className="w-11 h-11 rounded-theme grid place-items-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                    <it.icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted">{it.label}</p>
                    <p className="text-sm font-extrabold truncate">{it.value}</p>
                  </div>
                </>
              );
              return it.href ? (
                <a key={it.label} href={it.href} target={it.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="card card-hover p-4 flex items-center gap-3">
                  {Inner}
                </a>
              ) : (
                <div key={it.label} className="card p-4 flex items-center gap-3">{Inner}</div>
              );
            })}
          </div>

          <h2 className="text-lg md:text-xl font-extrabold mb-4 flex items-center gap-2">
            <Icons.book size={19} style={{ color: 'var(--primary)' }} /> سوالات پرتکرار
          </h2>
          <div className="space-y-2.5">
            {faqs.map((f, i) => (
              <details key={i} className="card p-4 group">
                <summary className="flex items-center justify-between gap-3 cursor-pointer text-sm font-extrabold list-none">
                  {f.q}
                  <Icons.chevronDown size={17} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-sm text-muted leading-7 mt-3 pt-3 border-t border-line">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
