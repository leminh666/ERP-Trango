'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { menuConfig, canAccessMenuItem } from '@/config/menu';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '@/config/system';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: DrawerProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = user?.role;

  // Lock body scroll when drawer is open (iOS fix)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer - Fixed height using 100dvh for iOS */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-[100dvh] w-72 bg-white transform transition-transform duration-200 ease-out lg:hidden',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header - Fixed, no scroll */}
        <div className="flex-shrink-0 flex items-center justify-between h-16 px-4 border-b bg-white">
          <Link
            href="/dashboard"
            className="text-lg font-bold text-blue-600"
            onClick={onClose}
          >
            {APP_NAME}
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg active:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Menu - Scrollable with iOS momentum */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {menuConfig.map((group) => (
            <div key={group.title} className="mb-4">
              {group.title && (
                <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.title}
                </h3>
              )}
              <ul className="space-y-1 px-3">
                {group.items.map((item) => {
                  const isAccessible = canAccessMenuItem(item, userRole);
                  const isActive = pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  if (!isAccessible) return null;

                  const IconComponent = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center px-3 py-3 text-sm font-medium transition-colors rounded-lg',
                          isActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                        onClick={onClose}
                      >
                        <IconComponent className={cn(
                          'mr-3 h-5 w-5 shrink-0',
                          isActive ? 'text-blue-600' : 'text-gray-400'
                        )} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t bg-white">
          <div className="text-xs text-gray-500 text-center">
            {APP_NAME} v{APP_VERSION}
          </div>
        </div>
      </aside>
    </>
  );
}

// Mobile menu button component
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-gray-500 hover:text-gray-700 lg:hidden"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}

