import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
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

interface DialogContentProps {
  className?: string;
  children: ReactNode;
}

export function DialogContent({ className, children }: DialogContentProps) {
  return (
    <div className={cn(
      'bg-white rounded-lg shadow-lg md:max-w-lg w-full md:max-h-[90vh] max-h-[85vh] md:overflow-hidden flex flex-col',
      'fixed inset-x-0 bottom-0 md:relative md:rounded-lg animate-in slide-in-from-bottom-4 md:slide-in-from-center',
      className
    )}>
      {children}
    </div>
  );
}

interface DialogHeaderProps {
  children: ReactNode;
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return (
    <div className="p-4 md:p-6 pb-0 flex-shrink-0">
      {/* Mobile drag handle indicator */}
      <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-300 rounded-full" />
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: ReactNode;
}

export function DialogTitle({ children }: DialogTitleProps) {
  return <h3 className="text-lg font-semibold">{children}</h3>;
}

