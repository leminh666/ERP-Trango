'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { MobileDrawer } from '@/components/drawer';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect if not logged in
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!token || !user) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Breadcrumbs */}
          <div className="mb-3 hidden md:block px-4 lg:px-5 pt-3">
            <Breadcrumbs />
          </div>

          {/* Page Content */}
          <div className="px-4 lg:px-5 pb-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
