'use client';

import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { METRIC_EXPLANATIONS } from '@/lib/metrics/metric-explanations';
import { METRIC_KEYS, MetricKey } from '@/lib/metrics/metric-keys';

interface InfoTooltipProps {
  content?: React.ReactNode;
  metricKey?: MetricKey;
  title?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  iconSize?: number;
  iconClassName?: string;
  children?: React.ReactNode;
}

/**
 * InfoTooltip Component
 * 
 * Displays an info icon that shows a tooltip on hover (desktop) or click (mobile).
 * 
 * Usage:
 * - <InfoTooltip content="Explanation text" />
 * - <InfoTooltip metricKey="wallet.summary.totalIncome" />
 * - <InfoTooltip metricKey="..." title="Custom Title" />
 */
export function InfoTooltip({
  content,
  metricKey,
  title,
  side = 'top',
  align = 'center',
  className,
  iconSize = 14,
  iconClassName = 'text-gray-400 hover:text-gray-600 cursor-help ml-1',
  children,
}: InfoTooltipProps) {
  // Resolve content from metricKey if provided
  const resolvedContent = React.useMemo(() => {
    if (content) {
      return content;
    }
    if (metricKey) {
      const explanation = METRIC_EXPLANATIONS[metricKey];
      if (explanation) {
        return formatExplanation(explanation);
      }
      // Fallback for missing key
      return `Tooltip chưa được cấu hình cho: ${metricKey}`;
    }
    return 'Thông tin';
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          className={cn('inline-flex items-center align-middle', iconClassName)}
          role="button"
          tabIndex={0}
          aria-label={resolvedTitle || 'Thông tin'}
        >
          {children || <HelpCircle size={iconSize} />}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn(
          'max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg',
          'bg-white text-sm text-gray-700',
          'p-3 sm:p-4',
          'leading-relaxed',
          'border shadow-xl rounded-lg',
          className
        )}
      >
        {resolvedTitle && (
          <div className="font-semibold text-gray-900 mb-1.5 text-sm">
            {resolvedTitle}
          </div>
        )}
        <div className="text-gray-600">
          {typeof resolvedContent === 'string' ? (
            <div className="whitespace-pre-line">{resolvedContent}</div>
          ) : (
            resolvedContent
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Format explanation object to readable text
 */
function formatExplanation(explanation: {
  title?: string;
  description: string;
  includes?: string[];
  excludes?: string[];
  formula?: string;
  source?: string[];
}): React.ReactNode {
  const parts: string[] = [];

  if (explanation.description) {
    parts.push(explanation.description);
  }

  if (explanation.includes && explanation.includes.length > 0) {
    parts.push('');
    parts.push('Bao gồm:');
    parts.push(explanation.includes.map(i => `  • ${i}`).join('\n'));
  }

  if (explanation.excludes && explanation.excludes.length > 0) {
    parts.push('');
    parts.push('Không bao gồm:');
    parts.push(explanation.excludes.map(e => `  • ${e}`).join('\n'));
  }

  if (explanation.formula) {
    parts.push('');
    parts.push(`Công thức: ${explanation.formula}`);
  }

  if (explanation.source && explanation.source.length > 0) {
    parts.push('');
    parts.push(`Nguồn: ${explanation.source.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Section title with info tooltip
 * 
 * Usage: <SectionTitle title="Tổng thu" metricKey="wallet.summary.totalIncome" />
 */
interface SectionTitleProps {
  title: string;
  metricKey?: MetricKey;
  className?: string;
  titleClassName?: string;
}

export function SectionTitle({
  title,
  metricKey,
  className,
  titleClassName,
}: SectionTitleProps) {
  return (
    <div className={cn('flex items-center', className)}>
      <h3 className={cn('font-semibold text-gray-900', titleClassName)}>
        {title}
      </h3>
      {metricKey && (
        <InfoTooltip metricKey={metricKey} />
      )}
    </div>
  );
}

/**
 * Get tooltip content from registry by key (alias for InfoTooltip with metricKey)
 * 
 * Usage: <KpiTooltip infoKey="wallet.summary.totalIncome" />
 */
interface KpiTooltipProps {
  infoKey: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  iconSize?: number;
}

export function KpiTooltip({
  infoKey,
  side = 'top',
  align = 'center',
  className,
  iconSize = 14,
}: KpiTooltipProps) {
  // Validate that the key exists in METRIC_KEYS
  const isValidKey = Object.values(METRIC_KEYS).includes(infoKey as MetricKey);

  if (!isValidKey) {
    // Warning for developers - key not found in registry
    console.warn(`[InfoTooltip] Unknown metric key: ${infoKey}`);
  }

  return (
    <InfoTooltip
      metricKey={infoKey as MetricKey}
      side={side}
      align={align}
      iconSize={iconSize}
      className={className}
    />
  );
}

/**
 * MetricKey-aware wrapper for InfoTooltip
 * Ensures type safety when using metric keys
 */
interface MetricTooltipProps {
  metricKey: MetricKey;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  iconSize?: number;
  iconClassName?: string;
}

export function MetricTooltip({
  metricKey,
  side = 'top',
  align = 'center',
  className,
  iconSize = 14,
  iconClassName,
}: MetricTooltipProps) {
  return (
    <InfoTooltip
      metricKey={metricKey}
      side={side}
      align={align}
      iconSize={iconSize}
      iconClassName={iconClassName}
      className={className}
    />
  );
}

export default InfoTooltip;
