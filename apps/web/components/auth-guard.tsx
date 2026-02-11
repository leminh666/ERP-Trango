'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { canAccessMenuItem } from '@/config/menu';
import { ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';

interface AuthGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
  fundPage?: boolean;
}

export function AuthGuard({ children, requiredRoles, fundPage }: AuthGuardProps) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  useEffect(() => {
    // Timeout to prevent infinite loading state
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[AuthGuard] Auth check timed out, forcing resolution');
        setAuthCheckComplete(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    setAuthCheckComplete(true);

    // Not logged in
    if (!token) {
      router.push('/login');
      return;
    }

    // Check role access for settings pages
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user?.role || '')) {
        router.push('/403');
        return;
      }
    }

    // Fund pages - STAFF can view but no actions
    if (fundPage && user?.role === 'STAFF') {
      // Allow access, actions will be disabled in components
      return;
    }
  }, [token, isLoading, router, user, requiredRoles, fundPage]);

  // Still checking auth
  if (isLoading && !authCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Đang kiểm tra quyền...</p>
        </div>
      </div>
    );
  }

  // No token - will redirect
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Component for disabled actions (STAFF on fund pages)
export function ActionTooltip({ children, adminOnly = false, role }: { children: ReactNode, adminOnly?: boolean, role?: string }) {
  if (adminOnly && role === 'STAFF') {
    return (
      <div className="relative group cursor-not-allowed">
        {children}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Chỉ ADMIN được thao tác
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
