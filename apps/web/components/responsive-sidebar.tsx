'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { menuConfig, canAccessMenuItem } from '@/config/menu';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { ComponentType } from 'react';
import { APP_NAME, APP_VERSION } from '@/config/system';

interface ResponsiveSidebarProps {
  className?: string;
}

export function ResponsiveSidebar({ className }: ResponsiveSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = user?.role;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Báo cáo', 'Danh mục', 'Sổ quỹ'])); // Default expanded

  // Get icon name from component for comparison
  const getIconName = (icon: ComponentType<{ className?: string }>) => {
    const iconName = icon.displayName || icon.name || '';
    return iconName;
  };

  // Toggle group expansion
  const toggleGroup = (groupTitle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupTitle)) {
      newExpanded.delete(groupTitle);
    } else {
      newExpanded.add(groupTitle);
    }
    setExpandedGroups(newExpanded);
  };

  // Groups that are collapsed by default (large groups EXCEPT Đơn hàng which is frequently used)
  const largeGroups = ['Sổ quỹ', 'Danh mục'];
  // Đơn hàng is kept expanded by default as it's frequently accessed

  // Check if group is expanded
  const isGroupExpanded = (groupTitle: string) => {
    return !largeGroups.includes(groupTitle) || expandedGroups.has(groupTitle);
  };

  return (
    <>
      {/* Desktop/iPad Sidebar - hidden on mobile, collapsible on iPad */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-white border-r min-h-screen shrink-0 transition-all duration-200',
          isCollapsed ? 'md:w-20 lg:w-20' : 'md:w-64 lg:w-64',
          className
        )}
      >
        {/* Logo */}
        <div className={cn(
          'h-14 flex items-center border-b shrink-0',
          isCollapsed ? 'justify-center px-2' : 'px-6'
        )}>
          {isCollapsed ? (
            <span className="text-xl font-bold text-blue-600">TG</span>
          ) : (
            <Link href="/dashboard" className="text-lg font-bold text-blue-600">
              {APP_NAME}
            </Link>
          )}
        </div>

        {/* Collapse Toggle - visible on md+ */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute top-14 right-0 translate-x-1/2 w-6 h-6 bg-white border rounded-full items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 z-10 cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Menu - Scrollable with iOS momentum */}
        <nav
          className="flex-1 py-3 overflow-y-auto overflow-x-hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {menuConfig.map((group) => {
            const isAccessible = group.items.some(item => canAccessMenuItem(item, userRole));
            if (!isAccessible) return null;

            const isExpanded = isGroupExpanded(group.title);
            const hasManyItems = group.items.length > 3;

            return (
              <div key={group.title} className={cn(
                'mb-1',
                isCollapsed ? 'px-1' : 'px-3'
              )}>
                {/* Group Header - collapsible for large groups */}
                {group.title && (
                  <div
                    className={cn(
                      'flex items-center justify-between px-3 py-1.5 cursor-pointer select-none group',
                      isCollapsed ? 'justify-center' : '',
                      isExpanded ? 'mb-0.5' : ''
                    )}
                    onClick={(e) => hasManyItems && toggleGroup(group.title, e)}
                  >
                    {!isCollapsed && (
                      <h3 className={cn(
                        'text-xs font-semibold text-gray-500 uppercase tracking-wider truncate',
                        hasManyItems && 'cursor-pointer hover:text-gray-700'
                      )}>
                        {group.title}
                      </h3>
                    )}
                    {hasManyItems && !isCollapsed && (
                      <span className="text-gray-400 group-hover:text-gray-600">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                )}

                {/* Group Items */}
                <ul className={cn(
                  'space-y-0.5',
                  isCollapsed ? 'px-1' : 'px-2'
                )}>
                  {group.items.map((item) => {
                    const itemAccessible = canAccessMenuItem(item, userRole);
                    const isActive = pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    if (!itemAccessible) return null;
                    if (!isExpanded) return null;

                    const IconComponent = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center transition-colors',
                            isCollapsed
                              ? 'justify-center px-2 py-2'
                              : 'px-3 py-2',
                            isActive
                              ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          )}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <IconComponent className={cn(
                            'h-4.5 w-4.5 shrink-0',
                            isActive ? 'text-blue-600' : 'text-gray-400'
                          )} />
                          {!isCollapsed && (
                            <span className="ml-3 text-sm font-medium truncate">
                              {item.label}
                            </span>
                          )}
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
        <div className={cn(
          'py-2 border-t',
          isCollapsed ? 'text-center px-1' : 'px-6'
        )}>
          {isCollapsed ? (
            <div className="text-xs text-gray-400">v{APP_VERSION}</div>
          ) : (
            <div className="text-xs text-gray-500 text-center">
              {APP_NAME} v{APP_VERSION}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
