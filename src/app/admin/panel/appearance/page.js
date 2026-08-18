import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { THEMES, LAYOUTS, FONTS } from '@/lib/themes';
import { PageHeader } from '@/components/admin/AdminUI';
import AppearanceManager from '@/components/admin/AppearanceManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'ظاهر و تم سایت' };

export default async function AppearancePage() {
  await requireAdmin();
  const s = await getSettings({ fresh: true });

  const initial = {
    theme: s.theme, layout: s.layout, font: s.font, radius: s.radius || '',
    storeName: s.storeName, storeNameFa: s.storeNameFa, logoText: s.logoText, tagline: s.tagline,
    logoImage: s.logoImage || '',
    showAnnouncementBar: s.showAnnouncementBar, announcementText: s.announcementText,
    heroTitle: s.heroTitle, heroSubtitle: s.heroSubtitle, heroCta: s.heroCta,
    heroCtaLink: s.heroCtaLink, heroImage: s.heroImage || '',
    footerAbout: s.footerAbout,
  };

  return (
    <>
      <PageHeader title="ظاهر و تم سایت" subtitle="تم رنگی، چیدمان کلی، فونت و محتوای بخش‌های اصلی صفحه نخست" icon="sparkle" />
      <AppearanceManager
        initial={initial}
        themes={Object.values(THEMES)}
        layouts={Object.values(LAYOUTS)}
        fonts={Object.values(FONTS)}
      />
    </>
  );
}
