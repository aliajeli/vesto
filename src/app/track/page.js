import { Suspense } from 'react';
import Shell from '@/components/Shell';
import TrackClient from './TrackClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'پیگیری سفارش' };

export default function TrackPage() {
  return (
    <Shell>
      <Suspense fallback={null}>
        <TrackClient />
      </Suspense>
    </Shell>
  );
}
