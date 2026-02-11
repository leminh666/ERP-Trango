'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

interface SheetContentProps {
  side?: 'bottom' | 'right' | 'left';
  className?: string;
  children: ReactNode;
  onClose?: () => void;
}

export function SheetContent({ side = 'bottom', className, children, onClose }: SheetContentProps) {
  if (side === 'bottom') {
    return (
      <div className={cn(
        'fixed bg-white md:hidden',
        'inset-x-0 bottom-0 rounded-t-2xl',
        'animate-in slide-in-from-bottom duration-200',
        'max-h-[85vh] overflow-y-auto',
        className
      )}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        {children}
      </div>
    );
  }

  // Right/Left side for larger screens (tablet)
  return (
    <div className={cn(
      'fixed bg-white hidden md:block',
      side === 'right' ? 'right-0 top-0 h-full' : 'left-0 top-0 h-full',
      'w-full max-w-md shadow-xl',
      'animate-in slide-in-from-right duration-200',
      'max-h-screen overflow-y-auto',
      className
    )}>
      {children}
    </div>
  );
}

interface SheetHeaderProps {
  className?: string;
  children: ReactNode;
}

export function SheetHeader({ className, children }: SheetHeaderProps) {
  return (
    <div className={cn('p-4 border-b flex items-center justify-between shrink-0', className)}>
      {children}
    </div>
  );
}

interface SheetTitleProps {
  className?: string;
  children: ReactNode;
}

export function SheetTitle({ className, children }: SheetTitleProps) {
  return <h3 className={cn('text-lg font-semibold', className)}>{children}</h3>;
}

interface SheetTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  onClick?: () => void;
}

export function SheetTrigger({ children, onClick }: SheetTriggerProps) {
  return (
    <div onClick={onClick} className="cursor-pointer">
      {children}
    </div>
  );
}

// Simple bottom sheet overlay for mobile
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed bg-white inset-x-0 bottom-0 rounded-t-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        {title && (
          <div className="px-4 pb-3 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

