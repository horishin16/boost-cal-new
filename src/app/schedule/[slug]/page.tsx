'use client';

import { use } from 'react';
import { ScheduleBookingContent } from '@/app/components/ScheduleBookingContent';

export default function ScheduleBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <ScheduleBookingContent slug={slug} />;
}
