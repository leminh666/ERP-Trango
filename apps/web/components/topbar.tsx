'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { MobileMenuButton, MobileDrawer } from './drawer';
import { Bell, User, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/config/system';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-4 lg:px-5 shrink-0 sticky top-0 z-30">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <MobileMenuButton onClick={onMenuClick} />
        <div className="hidden lg:block">
          <h1 className="text-base font-semibold text-gray-900">
            {APP_NAME}
          </h1>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8 flex-shrink-0">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100"
          >
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700 truncate max-w-[100px]">
              {user?.name}
            </span>
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-1 z-20">
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
