import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}

interface AlertDialogContentProps {
  className?: string;
  children: ReactNode;
}

export function AlertDialogContent({ className, children }: AlertDialogContentProps) {
  return (
    <div className={cn('bg-white rounded-lg shadow-lg max-w-md w-full', className)}>
      {children}
    </div>
  );
}

interface AlertDialogHeaderProps {
  children: ReactNode;
}

export function AlertDialogHeader({ children }: AlertDialogHeaderProps) {
  return <div className="p-6 pb-0">{children}</div>;
}

interface AlertDialogTitleProps {
  children: ReactNode;
}

export function AlertDialogTitle({ children }: AlertDialogTitleProps) {
  return <h3 className="text-lg font-semibold">{children}</h3>;
}

interface AlertDialogDescriptionProps {
  children: ReactNode;
}

export function AlertDialogDescription({ children }: AlertDialogDescriptionProps) {
  return <p className="text-sm text-gray-500 mt-2">{children}</p>;
}

interface AlertDialogFooterProps {
  children: ReactNode;
}

export function AlertDialogFooter({ children }: AlertDialogFooterProps) {
  return <div className="p-6 pt-4 flex justify-end gap-2">{children}</div>;
}

interface AlertDialogCancelProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function AlertDialogCancel({ children, onClick, disabled }: AlertDialogCancelProps) {
  return (
    <button
      type="button"
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

interface AlertDialogActionProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function AlertDialogAction({ children, onClick, className, disabled }: AlertDialogActionProps) {
  return (
    <button
      type="button"
      className={cn(
        'px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
        className || 'bg-blue-600'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

