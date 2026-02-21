'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Controlled value in YYYY-MM-DD format */
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

/**
 * DateInput — drop-in replacement for <Input type="date"> that works correctly
 * inside modals on iOS Safari / mobile Chrome.
 *
 * Key fixes:
 * - `touch-action: manipulation` prevents 300ms tap delay on iOS
 * - `max-w-full` + `min-w-0` prevent the native date widget from overflowing
 *   the modal container on narrow viewports
 * - `-webkit-appearance: none` + explicit height keep the control consistent
 *   across iOS/Android
 */
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="date"
        ref={ref}
        className={cn(
          // Base styles matching the shared Input component
          'flex h-9 w-full min-w-0 max-w-full rounded-md border border-input bg-background',
          'px-3 py-1.5 text-sm ring-offset-background',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Mobile-specific: prevent overflow and tap delay
          'touch-action-manipulation',
          // iOS Safari: ensure the date picker sheet opens correctly
          // and the input itself doesn't stretch beyond its container
          '[&::-webkit-date-and-time-value]:text-left',
          '[&::-webkit-calendar-picker-indicator]:opacity-70',
          '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
          className,
        )}
        style={{
          // Prevent iOS from adding extra padding that causes overflow
          WebkitAppearance: 'none',
          // Ensure the input respects its container width
          boxSizing: 'border-box',
        }}
        {...props}
      />
    );
  },
);
DateInput.displayName = 'DateInput';

export { DateInput };

