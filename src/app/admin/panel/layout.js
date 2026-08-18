import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import AdminShell from '@/components/admin/AdminShell';
import AdminLogin from '@/components/admin/AdminLogin';

export const dynamic = 'force-dynamic';

/** پنل مدیریت هرگز ایندکس نمی‌شود و لینکی در سایت ندارد */
export const metadata = {
  title: 'پنل مدیریت',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default async function AdminLayout({ children }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  // کاربر عادی وارد شده → 404 تلقی می‌شود (وجود پنل افشا نمی‌شود)
  if (user && user.role !== 'ADMIN') {
    redirect('/');
  }

  // بدون نشست → فرم ورود اختصاصی، بدون افشای ساختار پنل
  if (!user) {
    return <AdminLogin storeName={settings.storeNameFa || settings.storeName} />;
  }

  return (
    <AdminShell user={{ id: user.id, name: user.name, email: user.email }} storeName={settings.storeNameFa || settings.storeName}>
      {children}
    </AdminShell>
  );
}
