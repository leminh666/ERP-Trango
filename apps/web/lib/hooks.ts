import { useState, useEffect } from 'react';
import { TimeFilterValue, TimePreset } from '@/components/time-filter';
import { getDateRangeFromPreset } from '@/lib/date-presets';

/**
 * Default time filter = Tháng này (as per system requirements)
 */
export function getDefaultTimeFilter(): TimeFilterValue {
  const now = new Date();
  const range = getDateRangeFromPreset('this_month', now);

  return {
    from: range.from?.toISOString().split('T')[0] || '',
    to: range.to?.toISOString().split('T')[0] || '',
    preset: 'this_month' as TimePreset,
  };
}

/**
 * Hook để sync filter với preset
 * Default = 'this_month' per requirements
 */
export function useDefaultTimeFilter() {
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>(getDefaultTimeFilter);

  // Khi preset thay đổi từ 'custom' sang preset khác, cập nhật from/to
  useEffect(() => {
    if (timeFilter.preset !== 'custom') {
      const range = getDateRangeFromPreset(timeFilter.preset);
      
      setTimeFilter({
        from: range.from?.toISOString().split('T')[0] || '',
        to: range.to?.toISOString().split('T')[0] || '',
        preset: timeFilter.preset as TimePreset,
      });
    }
  }, [timeFilter.preset]);

  return { timeFilter, setTimeFilter };
}

