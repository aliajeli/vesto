import { getCategoriesTree } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import PwaRegister from './PwaRegister';

/** پوسته‌ی مشترک صفحات فروشگاه (سرور کامپوننت) */
export default async function Shell({ children }) {
  const [categories, user] = await Promise.all([getCategoriesTree(), getCurrentUser()]);
  const safeUser = user ? { id: user.id, name: user.name, role: user.role } : null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header categories={categories} user={safeUser} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer categories={categories} />
      <MobileNav user={safeUser} />
      <PwaRegister />
    </div>
  );
}
