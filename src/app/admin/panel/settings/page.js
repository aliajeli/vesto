import { requireAdmin } from '@/lib/auth';
import { getSettings, SECRET_KEYS } from '@/lib/settings';
import { PageHeader } from '@/components/admin/AdminUI';
import SettingsManager from '@/components/admin/SettingsManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'تنظیمات فروشگاه' };

function mask(v) {
  if (!v) return '';
  const s = String(v);
  return s.length <= 4 ? '••••' : `${'•'.repeat(Math.min(20, s.length - 4))}${s.slice(-4)}`;
}

export default async function SettingsPage() {
  await requireAdmin();
  const s = await getSettings({ fresh: true });

  const initial = {
    // فروش
    currencySuffix: s.currencySuffix,
    taxPercent: s.taxPercent,
    shippingFlat: s.shippingFlat,
    freeShippingThreshold: s.freeShippingThreshold,
    lowStockThreshold: s.lowStockThreshold,
    maxQtyPerItem: s.maxQtyPerItem,
    allowGuestCheckout: s.allowGuestCheckout,
    // تماس
    phone: s.phone, email: s.email, address: s.address,
    instagram: s.instagram, telegram: s.telegram, whatsapp: s.whatsapp,
    // پرداخت
    activeGateway: s.activeGateway,
    gatewaySandbox: s.gatewaySandbox,
    zibalMerchant: mask(s.zibalMerchant),
    zarinpalMerchant: mask(s.zarinpalMerchant),
    paypingToken: mask(s.paypingToken),
    // محتوا
    description: s.description,
    shippingPolicy: s.shippingPolicy,
    returnPolicy: s.returnPolicy,
    // سیستم
    maintenanceMode: s.maintenanceMode,
    maintenanceMessage: s.maintenanceMessage,
  };

  const hasKeys = {
    zibal: !!s.zibalMerchant,
    zarinpal: !!s.zarinpalMerchant,
    payping: !!s.paypingToken,
  };

  return (
    <>
      <PageHeader title="تنظیمات فروشگاه" subtitle="قیمت‌گذاری، ارسال، درگاه‌های پرداخت، اطلاعات تماس و قوانین" icon="settings" />
      <SettingsManager initial={initial} hasKeys={hasKeys} />
    </>
  );
}
