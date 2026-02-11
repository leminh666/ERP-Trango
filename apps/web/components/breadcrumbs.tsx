'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Parse pathname to breadcrumbs
  const paths = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: 'Trang chủ', href: '/dashboard' }];

  let currentPath = '';

  for (const path of paths) {
    currentPath += `/${path}`;
    // Convert to readable label
    const label = path
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({
      label: label === 'Dashboard' ? 'Dashboard' : label,
      href: currentPath,
    });
  }

  return (
    <nav className={cn('flex items-center space-x-2 text-sm', className)}>
      <Link
        href="/dashboard"
        className="flex items-center text-gray-500 hover:text-gray-700"
      >
        <Home className="h-4 w-4" />
      </Link>
      {items.slice(1).map((item, index) => {
        const isLast = index === items.length - 2;
        return (
          <span key={item.href} className="flex items-center">
            <span className="mx-2 text-gray-400">/</span>
            {isLast ? (
              <span className="text-gray-900 font-medium">{item.label}</span>
            ) : (
              <Link
                href={item.href!}
                className="text-gray-500 hover:text-gray-700"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
