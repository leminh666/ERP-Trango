'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isFeatureEnabled } from '@/config/features';
import { PageHeader } from '@/components/page-header';
import { AlertCircle } from 'lucide-react';

/**
 * Trang Nhắc nhở - TẠM THỜI DISABLED
 * Redirect về danh sách đơn hàng
 */
export default function OrdersRemindersPage() {
  const router = useRouter();

  // Redirect về danh sách đơn hàng khi feature bị tắt
  useEffect(() => {
    if (!isFeatureEnabled('ENABLE_REMINDERS')) {
      console.log('[Reminders] Module disabled, redirecting to /orders/list');
      router.replace('/orders/list');
    }
  }, [router]);

  // Nếu feature được bật, hiển thị thông báo đang phát triển
  if (isFeatureEnabled('ENABLE_REMINDERS')) {
    return (
      <div className="container mx-auto py-8">
        <PageHeader
          title="Nhắc nhở"
          description="Module đang trong quá trình phát triển"
        />
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-blue-500" />
          <p>Module Nhắc nhở đang được phát triển.</p>
          <p className="mt-2">Vui lòng quay lại sau.</p>
        </div>
      </div>
    );
  }

  // Hiển thị loading trong khi redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}
