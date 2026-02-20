'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { menuConfig, canAccessMenuItem } from '@/config/menu';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState, ComponentType } from 'react';
import { APP_NAME, APP_VERSION } from '@/config/system';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = user?.role;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Báo cáo', 'Danh mục', 'Sổ quỹ']));

  // Groups that are collapsed by default (large groups EXCEPT Đơn hàng which is frequently used)
  const largeGroups = ['Sổ quỹ', 'Danh mục'];
  // Đơn hàng is kept expanded by default as it's frequently accessed

  const toggleGroup = (groupTitle: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupTitle)) {
      newExpanded.delete(groupTitle);
    } else {
      newExpanded.add(groupTitle);
    }
    setExpandedGroups(newExpanded);
  };

  const isGroupExpanded = (groupTitle: string) => {
    return !largeGroups.includes(groupTitle) || expandedGroups.has(groupTitle);
  };

  return (
    <aside className="hidden lg:flex lg:flex-col w-56 bg-white border-r min-h-screen shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b shrink-0">
        <Link href="/dashboard" className="text-lg font-bold text-blue-600">
          {APP_NAME}
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {menuConfig.map((group) => {
          const isAccessible = group.items.some(item => canAccessMenuItem(item, userRole));
          if (!isAccessible) return null;

          const isExpanded = isGroupExpanded(group.title);
          const hasManyItems = group.items.length > 3;

          return (
            <div key={group.title} className="mb-1">
              {group.title && (
                <div
                  className={cn(
                    'flex items-center justify-between px-4 py-1.5 cursor-pointer select-none',
                    hasManyItems && 'hover:bg-gray-50 rounded'
                  )}
                  onClick={() => hasManyItems && toggleGroup(group.title)}
                >
                  <h3 className={cn(
                    'text-xs font-semibold text-gray-500 uppercase tracking-wider truncate',
                    hasManyItems && 'cursor-pointer hover:text-gray-700'
                  )}>
                    {group.title}
                  </h3>
                  {hasManyItems && (
                    <span className="text-gray-400">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3 transform rotate-[-90deg]" />
                      )}
                    </span>
                  )}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isItemAccessible = canAccessMenuItem(item, userRole);
                  const isActive = pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  if (!isItemAccessible) return null;
                  if (!isExpanded) return null;

                  const IconComponent = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center px-4 py-2 text-sm font-medium transition-colors min-h-[36px]',
                          isActive
                            ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <IconComponent className={cn(
                          'h-4 w-4.5 shrink-0 mr-3',
                          isActive ? 'text-blue-600' : 'text-gray-400'
                        )} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t">
        <div className="text-xs text-gray-500 text-center">
          {APP_NAME} v{APP_VERSION}
        </div>
      </div>
    </aside>
  );
}
