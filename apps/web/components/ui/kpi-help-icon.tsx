'use client';

import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import { MetricInfo } from './metric-info';
import { MetricKey } from '@/lib/metrics/metric-keys';

/**
 * Standardized KPI Help Icon Component
 * 
 * Ensures consistent tooltip icon size across the entire system.
 * 
 * Usage:
 * - <KpiHelpIcon metricKey="wallet.summary.totalIncome" />
 * - <KpiHelpIcon metricKey="..." size="md" />
 * - <KpiHelpIcon content={{ meaning: '...', calculatedFrom: [...] }} />
 * 
 * Size presets:
 * - sm: 14px (small, for compact cards)
 * - md: 16px (default, standard KPI cards)
 * - lg: 18px (large, for prominent metrics)
 */
interface KpiHelpIconProps {
  metricKey?: MetricKey;
  content?: {
    meaning?: string;
    calculatedFrom?: string[];
    excludes?: string[];
    formula?: string;
  };
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  className?: string;
}

const SIZE_MAP = {
  sm: 14,
  md: 16,
  lg: 18,
};

const ICON_CLASS_MAP = {
  light: 'text-gray-400 hover:text-gray-500 cursor-help shrink-0',
  dark: 'text-gray-500 hover:text-gray-700 cursor-help shrink-0',
};

export function KpiHelpIcon({
  metricKey,
  content,
  title,
  size = 'md',
  variant = 'light',
  className,
}: KpiHelpIconProps) {
  const iconSize = SIZE_MAP[size];
  const iconClassName = `${ICON_CLASS_MAP[variant]} ${className || ''}`;

  return (
    <MetricInfo
      metricKey={metricKey}
      content={content}
      title={title}
      iconSize={iconSize}
      iconClassName={iconClassName}
    />
  );
}

/**
 * Section title with standardized help icon
 * 
 * Usage: <KpiSectionTitle title="Tổng thu" metricKey="wallet.summary.totalIncome" />
 */
interface KpiSectionTitleProps {
  title: string;
  metricKey?: string;
  content?: {
    meaning?: string;
    calculatedFrom?: string[];
    excludes?: string[];
    formula?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  titleClassName?: string;
}

export function KpiSectionTitle({
  title,
  metricKey,
  content,
  size = 'md',
  className,
  titleClassName,
}: KpiSectionTitleProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`font-semibold text-gray-900 ${titleClassName}`}>
        {title}
      </span>
      {(metricKey || content) && (
        <KpiHelpIcon metricKey={metricKey as any} content={content} size={size} />
      )}
    </div>
  );
}

/**
 * KPI Card title with standardized help icon
 * 
 * Usage: <KpiCardTitle label="Tổng thu" metricKey="wallet.summary.totalIncome" />
 */
interface KpiCardTitleProps {
  label: string;
  metricKey?: string;
  content?: {
    meaning?: string;
    calculatedFrom?: string[];
    excludes?: string[];
    formula?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
}

export function KpiCardTitle({
  label,
  metricKey,
  content,
  size = 'md',
  className,
  icon,
}: KpiCardTitleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {icon}
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {(metricKey || content) && (
        <KpiHelpIcon metricKey={metricKey as any} content={content} size={size} />
      )}
    </div>
  );
}

export default KpiHelpIcon;

