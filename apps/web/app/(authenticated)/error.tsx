'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { logout } = useAuth();

  useEffect(() => {
    // Log the error for debugging
    console.error('[AuthenticatedError] Error in authenticated route:', error);
  }, [error]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Đã xảy ra lỗi xác thực
          </h1>
          <p className="text-gray-600 mb-4">
            Rất tiếc, đã có lỗi không mong muốn xảy ra. Vui lòng thử lại hoặc đăng nhập lại.
          </p>
          {error.message && (
            <p className="text-sm text-gray-500 mb-4 font-mono bg-gray-100 p-2 rounded overflow-auto max-h-32">
              {error.message}
            </p>
          )}
          {error.digest && (
            <p className="text-xs text-gray-400">
              Mã lỗi: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
          <Button variant="default" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </div>
    </div>
  );
}

