'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Tabs = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}>(({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue || value || '');

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value);
    }
  }, [value]);

  const handleTabChange = (newValue: string) => {
    if (value === undefined) {
      setActiveTab(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        
        if (child.type === TabsList) {
          return React.cloneElement(child as React.ReactElement<any>, { 
            activeTab, onTabChange: handleTabChange 
          });
        }
        
        if (child.type === TabsContent) {
          const contentValue = child.props.value;
          const isActive = contentValue === activeTab;
          if (!isActive) return null;
          return child;
        }
        
        return child;
      })}
    </div>
  );
});
Tabs.displayName = 'Tabs';

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, activeTab, onTabChange, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return null;
          return React.cloneElement(child as React.ReactElement<any>, {
            isActive: child.props.value === activeTab,
            onSelect: () => onTabChange?.(child.props.value),
          });
        })}
      </div>
    );
  }
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  isActive?: boolean;
  onSelect?: () => void;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, isActive, onSelect, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onSelect}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
          isActive
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, children, value, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mt-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };

