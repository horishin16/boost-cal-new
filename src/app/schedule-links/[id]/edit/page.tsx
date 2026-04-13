'use client';

import { use } from 'react';
import { ScheduleLinkForm } from '@/app/components/ScheduleLinkForm';

export default function EditScheduleLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <ScheduleLinkForm editId={id} />
    </div>
  );
}
