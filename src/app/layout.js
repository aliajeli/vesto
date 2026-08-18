import './globals.css';
import { getPublicSettings } from '@/lib/settings';
import { THEMES, LAYOUTS, FONTS, themeCss } from '@/lib/themes';
import Providers from '@/components/Providers';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const s = await getPublicSettings();
  const title = `${s.storeNameFa || s.storeName} | ${s.tagline}`;
  return {
    title: { default: title, template: `%s | ${s.storeNameFa || s.storeName}` },
    description: s.description,
    applicationName: s.storeName,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: s.storeName },
    formatDetection: { telephone: false },
    openGraph: {
      title,
      description: s.description,
      type: 'website',
      locale: 'fa_IR',
      siteName: s.storeName,
    },
    robots: { index: true, follow: true },
  };
}

export async function generateViewport() {
  const s = await getPublicSettings();
  const t = THEMES[s.theme] || THEMES.midnight;
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    viewportFit: 'cover',
    themeColor: t.vars['--bg'],
  };
}

export default async function RootLayout({ children }) {
  const settings = await getPublicSettings();
  const theme = THEMES[settings.theme] || THEMES.midnight;
  const layout = LAYOUTS[settings.layout] || LAYOUTS.editorial;
  const font = FONTS[settings.font] || FONTS.vazir;

  const extra = {};
  if (settings.radius) extra['--radius'] = settings.radius;
  const css = `${themeCss(theme.id, extra)};--font-stack:${font.stack}`;

  return (
    <html lang="fa" dir="rtl" data-theme={theme.id} data-mode={theme.mode} data-layout={layout.id} suppressHydrationWarning>
      <head>
        <style
          id="vesto-theme"
          dangerouslySetInnerHTML={{ __html: `:root{${css}}` }}
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[300] btn btn-primary"
        >
          پرش به محتوای اصلی
        </a>
        <Providers settings={settings}>{children}</Providers>
      </body>
    </html>
  );
}
