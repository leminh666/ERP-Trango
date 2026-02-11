'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { METRIC_EXPLANATIONS } from '@/lib/metrics/metric-explanations';
import { METRIC_KEYS, MetricKey } from '@/lib/metrics/metric-keys';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  Placement,
  FloatingPortal,
} from '@floating-ui/react';

/**
 * Detect if device supports hover (desktop) or not (mobile/tablet)
 * Uses SSR-safe approach: defaults to false (desktop) during SSR/hydration
 */
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false);

  React.useEffect(() => {
    // Default to false (desktop behavior) during SSR/hydration
    // Only detect touch capability after mount
    const mediaQuery = window.matchMedia('(hover: none), (pointer: coarse)');
    setIsTouch(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsTouch(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isTouch;
}

/**
 * MetricInfo Component
 *
 * A tooltip component that:
 * - Desktop: Shows on hover (no click needed)
 * - Mobile/Tablet: Shows on click/tap
 * - Renders in portal to avoid layout shifts
 * - Content is 100% Vietnamese with specific format
 *
 * Usage:
 * <MetricInfo metricKey="cashbook.totalIncome" />
 * <MetricInfo title="Tổng thu" content="..." />
 */
interface MetricInfoProps {
  metricKey?: MetricKey;
  title?: string;
  content?: {
    meaning?: string;
    calculatedFrom?: string[];
    excludes?: string[];
    formula?: string;
  };
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  iconSize?: number;
  iconClassName?: string;
  showIcon?: boolean;
}

/**
 * TouchDeviceView - Component for mobile/tablet (click to open)
 */
function TouchDeviceView({
  resolvedTitle,
  formattedContent,
  iconSize,
  iconClassName,
  side,
  align,
  className,
}: {
  resolvedTitle?: string;
  formattedContent: string | null;
  iconSize: number;
  iconClassName: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  align: 'start' | 'center' | 'end';
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          className={cn('inline-flex items-center align-middle', iconClassName)}
          role="button"
          tabIndex={0}
          aria-label={resolvedTitle || 'Giải thích'}
        >
          <HelpCircle size={iconSize} />
        </span>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn(
          'max-w-[280px] sm:max-w-[320px]',
          'bg-white text-sm text-gray-700',
          'p-3',
          'leading-relaxed',
          'border shadow-xl rounded-lg',
          'z-[9999]',
          className
        )}
      >
        {resolvedTitle && (
          <div className="font-semibold text-gray-900 mb-2 text-sm">
            {resolvedTitle}
          </div>
        )}
        <div className="text-gray-600 whitespace-pre-line">
          {formattedContent || 'Thông tin chưa được cấu hình'}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * DesktopView - Component for desktop (hover to open)
 */
function DesktopView({
  resolvedTitle,
  formattedContent,
  iconSize,
  iconClassName,
  tooltipId,
  refs,
  floatingStyles,
  placement,
  getReferenceProps,
  getFloatingProps,
  isOpen,
}: {
  resolvedTitle?: string;
  formattedContent: string | null;
  iconSize: number;
  iconClassName: string;
  tooltipId: string;
  refs: any;
  floatingStyles: React.CSSProperties;
  placement: string;
  getReferenceProps: any;
  getFloatingProps: any;
  isOpen: boolean;
}) {
  const tooltipContent = isOpen ? (
    <div
      ref={refs.setFloating}
      id={tooltipId}
      role="tooltip"
      className={cn(
        'z-[99999] w-[280px] sm:w-[320px] max-w-[90vw]',
        'transition-opacity duration-200',
        'pointer-events-auto',
        'animate-in fade-in-0 zoom-in-95'
      )}
      style={floatingStyles}
      {...getFloatingProps()}
    >
      <div
        className={cn(
          'bg-gray-900 text-white text-sm',
          'p-3 rounded-lg shadow-2xl',
          'leading-relaxed',
          'max-h-[80vh] overflow-y-auto',
          'border border-gray-800'
        )}
      >
        {resolvedTitle && (
          <div className="font-semibold mb-2 text-sm text-white">
            {resolvedTitle}
          </div>
        )}
        <div className="text-gray-100 whitespace-pre-line">
          {formattedContent || 'Thông tin chưa được cấu hình'}
        </div>
      </div>
      {/* Arrow - position based on placement from Floating UI */}
      {placement.startsWith('top') && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      )}
      {placement.startsWith('bottom') && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
      )}
      {placement.startsWith('right') && (
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      )}
      {placement.startsWith('left') && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
      )}
    </div>
  ) : null;

  return (
    <>
      <span
        ref={refs.setReference}
        className={cn(iconClassName, 'inline-flex items-center')}
        role="button"
        tabIndex={0}
        aria-label={resolvedTitle || 'Giải thích'}
        aria-describedby={isOpen ? tooltipId : undefined}
        {...getReferenceProps()}
      >
        <HelpCircle size={iconSize} />
      </span>
      {/* Render tooltip via FloatingPortal to avoid layout shifts */}
      {isOpen && (
        <FloatingPortal>
          {tooltipContent}
        </FloatingPortal>
      )}
    </>
  );
}

export function MetricInfo({
  metricKey,
  title,
  content,
  side = 'top',
  align = 'center',
  className,
  iconSize = 16,
  iconClassName = 'text-gray-400 hover:text-gray-600 cursor-help shrink-0 inline-flex',
  showIcon = true,
}: MetricInfoProps) {
  // ALL HOOKS MUST BE CALLED IN THE SAME ORDER EVERY TIME
  const isTouch = useIsTouchDevice();
  const [isOpen, setIsOpen] = React.useState(false);
  const tooltipId = React.useId();

  // Resolve content from metricKey if provided
  const resolvedContent = React.useMemo(() => {
    if (content) {
      return content;
    }
    if (metricKey) {
      const explanation = METRIC_EXPLANATIONS[metricKey];
      if (explanation) {
        return {
          meaning: explanation.description,
          calculatedFrom: explanation.includes,
          excludes: explanation.excludes,
          formula: explanation.formula,
        };
      }
    }
    return undefined;
  }, [content, metricKey]);

  // Resolve title from metricKey if not explicitly provided
  const resolvedTitle = React.useMemo(() => {
    if (title) {
      return title;
    }
    if (metricKey) {
      const explanation = METRIC_EXPLANATIONS[metricKey];
      if (explanation) {
        return explanation.title;
      }
    }
    return undefined;
  }, [title, metricKey]);

  // Format content for display
  const formattedContent = React.useMemo(() => {
    if (!resolvedContent) return null;

    const parts: string[] = [];

    if (resolvedContent.meaning) {
      parts.push(`Ý nghĩa: ${resolvedContent.meaning}`);
    }

    if (resolvedContent.calculatedFrom && resolvedContent.calculatedFrom.length > 0) {
      parts.push('');
      parts.push('Tính từ:');
      resolvedContent.calculatedFrom.forEach((item) => {
        parts.push(`• ${item}`);
      });
    }

    if (resolvedContent.excludes && resolvedContent.excludes.length > 0) {
      parts.push('');
      parts.push('Không tính:');
      resolvedContent.excludes.forEach((item) => {
        parts.push(`• ${item}`);
      });
    }

    if (resolvedContent.formula) {
      parts.push('');
      parts.push(`Công thức: ${resolvedContent.formula}`);
    }

    return parts.join('\n');
  }, [resolvedContent]);

  // Desktop: hover to open, mobile: click to open
  const { refs, floatingStyles, placement, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'right' as Placement,
    middleware: [
      offset(10),
      flip({
        fallbackPlacements: ['bottom', 'left', 'top'],
        padding: 8,
      }),
      shift({
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
    strategy: 'fixed',
  });

  const hover = useHover(context, {
    enabled: !isTouch,
    delay: { open: 100, close: 0 },
  });
  const focus = useFocus(context, {
    enabled: !isTouch,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // For mobile, handle click manually
  React.useEffect(() => {
    if (isTouch) {
      const handleClick = (e: MouseEvent) => {
        const refEl = refs.reference.current;
        if (refEl && 'contains' in refEl && refEl.contains(e.target as Node)) {
          setIsOpen(!isOpen);
        }
      };
      const handleClickOutside = (e: MouseEvent) => {
        const refEl = refs.reference.current;
        const floatEl = refs.floating.current;
        if (
          refEl &&
          'contains' in refEl &&
          !refEl.contains(e.target as Node) &&
          floatEl &&
          !floatEl.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener('click', handleClick);
      if (isOpen) {
        document.addEventListener('click', handleClickOutside);
      }
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isTouch, isOpen, refs]);

  // Render based on device type - NO EARLY RETURN AFTER HOOKS!
  if (isTouch) {
    return (
      <TouchDeviceView
        resolvedTitle={resolvedTitle}
        formattedContent={formattedContent}
        iconSize={iconSize}
        iconClassName={iconClassName}
        side={side}
        align={align}
        className={className}
      />
    );
  }

  return (
    <DesktopView
      resolvedTitle={resolvedTitle}
      formattedContent={formattedContent}
      iconSize={iconSize}
      iconClassName={iconClassName}
      tooltipId={tooltipId}
      refs={refs}
      floatingStyles={floatingStyles}
      placement={placement}
      getReferenceProps={getReferenceProps}
      getFloatingProps={getFloatingProps}
      isOpen={isOpen}
    />
  );
}

/**
 * Helper component that wraps MetricInfo for use in flex/inline contexts
 * without affecting layout
 */
interface MetricInfoInlineProps {
  metricKey?: MetricKey;
  title?: string;
  content?: MetricInfoProps['content'];
  className?: string;
  iconSize?: number;
}

export function MetricInfoInline({
  metricKey,
  title,
  content,
  className,
  iconSize = 16,
}: MetricInfoInlineProps) {
  return (
    <span className="group/tooltip-container inline-flex items-center">
      <MetricInfo
        metricKey={metricKey}
        title={title}
        content={content}
        className={className}
        iconSize={iconSize}
        iconClassName="text-gray-400 hover:text-gray-600 cursor-help ml-1 shrink-0"
      />
    </span>
  );
}

/**
 * Section title with built-in info icon
 */
interface MetricSectionTitleProps {
  title: string;
  metricKey?: MetricKey;
  content?: MetricInfoProps['content'];
  className?: string;
  titleClassName?: string;
  iconSize?: number;
}

export function MetricSectionTitle({
  title,
  metricKey,
  content,
  className,
  titleClassName,
  iconSize = 16,
}: MetricSectionTitleProps) {
  return (
    <div className={cn('flex items-center', className)}>
      <h3 className={cn('font-semibold text-gray-900', titleClassName)}>
        {title}
      </h3>
      {(metricKey || content) && (
        <MetricInfo
          metricKey={metricKey}
          content={content}
          iconSize={iconSize}
          iconClassName="text-gray-400 hover:text-gray-600 cursor-help ml-1.5 shrink-0"
        />
      )}
    </div>
  );
}

/**
 * KPI Card title with info icon
 * Use this for KPI cards to ensure consistent layout
 */
interface MetricCardTitleProps {
  label: string;
  metricKey?: MetricKey;
  content?: MetricInfoProps['content'];
  className?: string;
  icon?: React.ReactNode;
}

export function MetricCardTitle({
  label,
  metricKey,
  content,
  className,
  icon,
}: MetricCardTitleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {(metricKey || content) && (
        <MetricInfo
          metricKey={metricKey}
          content={content}
          iconSize={14}
          iconClassName="text-gray-400 hover:text-gray-600 cursor-help shrink-0"
        />
      )}
    </div>
  );
}

export default MetricInfo;

