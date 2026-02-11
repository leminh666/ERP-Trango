'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SafeResponsiveContainerProps {
  children: ReactNode;
  minHeight?: number;
  className?: string;
  loading?: boolean;
}

export function SafeResponsiveContainer({
  children,
  minHeight = 280,
  className,
  loading = false,
}: SafeResponsiveContainerProps) {
  const [hasMounted, setHasMounted] = useState(false);

  // Mark as mounted after hydration to prevent SSR mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // After mounted, always render chart (no placeholder blocking)
  // This prevents the issue where ResizeObserver doesn't update size in time
  if (!hasMounted) {
    return (
      <div className={cn('w-full', className)} style={{ minHeight }}>
        <div
          className="w-full flex items-center justify-center animate-pulse text-gray-400 text-sm"
          style={{ height: minHeight }}
        >
          Đang tải biểu đồ...
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ minHeight }}>
      {children}
    </div>
  );
}

