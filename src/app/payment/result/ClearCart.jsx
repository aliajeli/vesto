'use client';

import { useEffect } from 'react';
import { useCart } from '@/components/Providers';

/** پس از پرداخت موفق، سبد خرید محلی پاک می‌شود */
export default function ClearCart() {
  const cart = useCart();
  useEffect(() => {
    cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
