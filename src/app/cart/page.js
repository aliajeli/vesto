import Shell from '@/components/Shell';
import CartClient from './CartClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'سبد خرید' };

export default function CartPage() {
  return (
    <Shell>
      <CartClient />
    </Shell>
  );
}
