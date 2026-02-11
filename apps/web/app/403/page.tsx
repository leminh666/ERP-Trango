'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ForbiddenPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Auto redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">403</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Không có quyền truy cập</h2>
        <p className="text-gray-500 mb-8">
          Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là lỗi.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <Link href="/dashboard">
            <Button className="w-full">
              <Lock className="mr-2 h-4 w-4" />
              Về Dashboard
            </Button>
          </Link>
        </div>
        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
          <p className="font-medium">Thông tin người dùng hiện tại:</p>
          <p>Tên: {user?.name}</p>
          <p>Email: {user?.email}</p>
          <p>Vai trò: <span className="font-semibold">{user?.role}</span></p>
        </div>
      </div>
    </div>
  );
}
