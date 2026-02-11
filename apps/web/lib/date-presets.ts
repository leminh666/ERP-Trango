import { addDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, subDays } from 'date-fns';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Standardized Date Presets for ERP System
 * Only 7 presets as per requirements:
 * 1. Hôm nay (today)
 * 2. Hôm qua (yesterday)
 * 3. Tháng này (DEFAULT)
 * 4. Tháng trước (last_month)
 * 5. Năm này (this_year)
 * 6. Năm trước (last_year)
 * 7. Chọn ngày (custom)
 */
export type DatePreset = 
  | 'today'
  | 'yesterday'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DateRangePreset {
  label: string;
  value: DatePreset;
  shortLabel?: string;
}

/**
 * Standard presets - simplified to 7 options per requirements
 */
export const DATE_PRESETS: DateRangePreset[] = [
  { label: 'Hôm nay', value: 'today', shortLabel: 'Hôm nay' },
  { label: 'Hôm qua', value: 'yesterday', shortLabel: 'Hôm qua' },
  { label: 'Tháng này', value: 'this_month', shortLabel: 'Tháng này' },
  { label: 'Tháng trước', value: 'last_month', shortLabel: 'Tháng trước' },
  { label: 'Năm này', value: 'this_year', shortLabel: 'Năm nay' },
  { label: 'Năm trước', value: 'last_year', shortLabel: 'Năm trước' },
];

/**
 * Get date range from preset
 * @param preset - The preset to use
 * @param referenceDate - Reference date for calculations (defaults to now)
 * @returns DateRange with from/to dates (inclusive)
 * 
 * Convention:
 * - from = start of day 00:00:00
 * - to = end of day 23:59:59.999
 * - this_month = from start of current month to today/current date
 */
export function getDateRangeFromPreset(preset: DatePreset, referenceDate: Date = new Date()): DateRange {
  const today = startOfDay(referenceDate);
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  switch (preset) {
    case 'today':
      return { from: today, to: endOfDay(today) };
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case 'this_month':
      // From start of current month to current date (today)
      return { from: startOfMonth(today), to: endOfDay(today) };
    case 'last_month':
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'this_year':
      return { from: startOfYear(today), to: endOfYear(today) };
    case 'last_year':
      const lastYear = subYears(today, 1);
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    default:
      // custom - return current month as default
      return { from: startOfMonth(today), to: endOfDay(today) };
  }
}

export function formatDateRange(range: DateRange): string {
  const { from, to } = range;
  if (!from && !to) return 'Chọn thời gian';
  
  const formatStr = 'dd/MM/yyyy';
  const fromStr = from ? format(from, formatStr, { locale: vi }) : '...';
  const toStr = to ? format(to, formatStr, { locale: vi }) : '...';
  
  return `${fromStr} - ${toStr}`;
}

export function formatDateForInput(date: Date | undefined): string {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}

export function parseDateFromInput(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

export function getPresetLabel(preset: DatePreset, customRange?: DateRange): string {
  if (preset === 'custom' && customRange) {
    return formatDateRange(customRange);
  }
  const found = DATE_PRESETS.find(p => p.value === preset);
  return found?.label || 'Chọn thời gian';
}

export function datesEqual(a: Date | undefined, b: Date | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

