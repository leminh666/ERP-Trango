'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { APP_NAME } from '@/config/system';

// Safe localStorage access for SSR
function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// Login form content - uses useSearchParams (must be client component)
function LoginFormContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const submitLockRef = useRef(false);

  // Set mounted state - critical for SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load saved credentials after mount
  useEffect(() => {
    if (!mounted) return;

    const savedEmail = getStorageItem('loginEmail');
    const savedRemember = getStorageItem('loginRemember');

    if (savedEmail) {
      setEmail(savedEmail);
    } else {
      setEmail('admin@demo.com');
    }

    if (savedRemember !== null) {
      setRememberLogin(savedRemember === 'true');
    }

    // Handle redirect reasons
    const reason = searchParams.get('reason');
    if (reason === 'expired') {
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    } else if (reason === 'unauthorized') {
      setError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
    } else if (reason === 'logout') {
      setInfo('Bạn đã đăng xuất thành công.');
    }
  }, [mounted, searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (!mounted) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [mounted, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submit
    if (submitLockRef.current) {
      return;
    }

    // Basic validation
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setError('');
    setInfo('');
    setIsSubmitting(true);
    submitLockRef.current = true;

    console.log('[LOGIN] Starting login attempt for:', email);

    try {
      // Call backend login API
      const data = await apiClient<{
        accessToken: string;
        user: { id: string; email: string; name: string; role: string };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember: rememberLogin }),
      });

      console.log('[LOGIN] API success, user role:', data.user?.role);

      // Validate response
      if (!data.accessToken || !data.user) {
        throw new Error('Phản hồi không hợp lệ từ server');
      }

      // Save remember preference (email only)
      if (rememberLogin) {
        setStorageItem('loginEmail', email);
        setStorageItem('loginRemember', 'true');
      } else {
        removeStorageItem('loginEmail');
        setStorageItem('loginRemember', 'false');
      }

      // Login and redirect
      login(data.accessToken, data.user);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      console.error('[LOGIN ERROR]', errorMessage);
      setError(errorMessage);
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  // Don't render form until mounted (SSR safety)
  if (!mounted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
          <CardDescription>Đang tải...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{APP_NAME}</CardTitle>
        <CardDescription>Đăng nhập vào hệ thống ERP</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          {info && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md">
              {info}
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="email@demo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Mật khẩu
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="flex items-start">
            <input
              id="remember"
              type="checkbox"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-gray-900">
              Ghi nhớ đăng nhập
              <p className="text-xs text-gray-500 mt-0.5">
                Lưu email để lần sau đăng nhập nhanh hơn
              </p>
            </label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </Button>
          <div className="w-full text-center text-sm">
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Hoặc</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild disabled={isSubmitting}>
            <a href="/auth/google/start">
              <svg className="mr-2 h-4 w-4" aria-hidden="true" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 265.8 0 129.2 109.8 20 244 20c73.2 0 136 28.7 182.4 75.2L376.3 149.5c-30.1-28.7-70.4-46.5-119.9-46.5-93.8 0-170.3 76.5-170.3 170.3s76.5 170.3 170.3 170.3c109.4 0 152.2-82.9 157.8-124.2H244V261.8h244z"></path></svg>
              Đăng nhập bằng Google
            </a>
          </Button>

          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Quay về trang chủ
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

// Loading fallback for Suspense
function LoginFormFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
        <CardDescription>Đang tải...</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </CardContent>
    </Card>
  );
}

// Main page component - wraps content in Suspense for useSearchParams
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
