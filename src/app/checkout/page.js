import Shell from '@/components/Shell';
import CheckoutClient from './CheckoutClient';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import prisma from '@/lib/db';
import { GATEWAYS, gatewayIsConfigured } from '@/lib/gateways';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'تسویه حساب' };

export default async function CheckoutPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  const addresses = user
    ? await prisma.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: 'desc' } })
    : [];

  // فقط درگاه‌های پیکربندی‌شده به کلاینت ارسال می‌شوند (بدون کلید)
  const available = Object.values(GATEWAYS)
    .filter((g) => gatewayIsConfigured(g.id, settings) && (g.id !== 'sandbox' || settings.gatewaySandbox))
    .map((g) => ({ id: g.id, label: g.label }));

  return (
    <Shell>
      <CheckoutClient
        user={user ? { id: user.id, name: user.name, phone: user.phone, email: user.email } : null}
        addresses={addresses}
        gateways={available.length ? available : [{ id: 'sandbox', label: 'شبیه‌ساز داخلی (تست)' }]}
        defaultGateway={settings.activeGateway}
        allowGuest={!!settings.allowGuestCheckout}
      />
    </Shell>
  );
}
