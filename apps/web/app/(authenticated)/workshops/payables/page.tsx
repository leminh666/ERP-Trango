'use client';

import { PageHeader } from '@/components/page-header';
import { SkeletonCard } from '@/components/skeleton';

export default function SkeletonWorkshopsPayables() {
  return (
    <div>
      <PageHeader title="Công nợ xưởng" description="Quản lý công nợ xưởng gia công" />
      <SkeletonCard />
    </div>
  );
}

