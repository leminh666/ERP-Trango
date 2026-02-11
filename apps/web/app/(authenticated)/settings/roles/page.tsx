'use client';

import { PageHeader } from '@/components/page-header';
import { SkeletonCard } from '@/components/skeleton';
import { AuthGuard } from '@/components/auth-guard';

export default function SkeletonSettingsRoles() {
  return (
    <AuthGuard requiredRoles={['ADMIN']}>
      <div>
        <PageHeader title="Vai trò & Quyền" description="Quản lý vai trò và phân quyền" />
        <SkeletonCard />
      </div>
    </AuthGuard>
  );
}

