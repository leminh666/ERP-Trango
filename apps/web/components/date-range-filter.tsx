'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { 
  DatePreset, 
  DateRange, 
  DateRangePreset, 
  DATE_PRESETS,
  getDateRangeFromPreset,
  formatDateRange,
  datesEqual
} from '@/lib/date-presets';

interface DateRangeFilterProps {
  value: { from: string; to: string; preset: DatePreset };
  onChange: (value: { from: string; to: string; preset: DatePreset }) => void;
  className?: string;
  showPresets?: boolean;
  numberOfMonths?: 1 | 2;
}

export function DateRangeFilter({ 
  value, 
  onChange, 
  className,
  showPresets = true,
  numberOfMonths = 2
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  
  // Parse current dates from string
  const [fromDate, setFromDate] = useState<Date | undefined>(
    value.from ? new Date(value.from) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    value.to ? new Date(value.to) : undefined
  );

  // Update internal state when value prop changes
  useEffect(() => {
    const newFrom = value.from ? new Date(value.from) : undefined;
    const newTo = value.to ? new Date(value.to) : undefined;
    
    if (!datesEqual(newFrom, fromDate)) {
      setFromDate(newFrom);
    }
    if (!datesEqual(newTo, toDate)) {
      setToDate(newTo);
    }
  }, [value.from, value.to]);

  // When preset changes, update dates
  useEffect(() => {
    if (value.preset !== 'custom') {
      const range = getDateRangeFromPreset(value.preset);
      setFromDate(range.from);
      setToDate(range.to);
    }
  }, [value.preset]);

  const handlePresetChange = (preset: DatePreset) => {
    if (preset === 'custom') {
      onChange({ ...value, preset });
      // Stay open for custom selection
    } else {
      const range = getDateRangeFromPreset(preset);
      onChange({
        preset,
        from: range.from?.toISOString().split('T')[0] || '',
        to: range.to?.toISOString().split('T')[0] || '',
      });
      setOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (fromDate && toDate) {
      onChange({
        preset: 'custom',
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      });
      setOpen(false);
    }
  };

  const handleCustomClear = () => {
    setFromDate(undefined);
    setToDate(undefined);
  };

  const getDisplayLabel = (): string => {
    if (value.preset !== 'custom') {
      const preset = DATE_PRESETS.find(p => p.value === value.preset);
      return preset?.shortLabel || preset?.label || 'Chọn thời gian';
    }
    
    // For custom, show date range
    const range: DateRange = { from: fromDate, to: toDate };
    return formatDateRange(range);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium',
            'ring-offset-background transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            'h-10 px-3 py-2 min-w-[160px]',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 opacity-70" />
            <span className="truncate">{getDisplayLabel()}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent
        className="w-auto p-0"
        side="bottom"
        align="start"
        sideOffset={4}
        style={{ 
          minWidth: showPresets 
            ? (numberOfMonths === 2 ? 'min(90vw, 720px)' : 'min(90vw, 360px)') 
            : (numberOfMonths === 2 ? 'min(90vw, 600px)' : 'min(90vw, 320px)')
        }}
      >
        <div className="flex max-w-full overflow-hidden">
          {/* Presets sidebar */}
          {showPresets && (
            <div className="w-[140px] border-r p-3 bg-gray-50/50 shrink-0 overflow-y-auto max-h-[400px]">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">Khoảng TG</div>
              <div className="space-y-0.5">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={cn(
                      'w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors',
                      value.preset === preset.value 
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'hover:bg-gray-200 text-gray-700'
                    )}
                    onClick={() => handlePresetChange(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Calendar section */}
          <div className="p-3 shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Chọn ngày</div>
              <div className="text-xs text-muted-foreground">
                {fromDate && toDate ? `${formatDateRange({ from: fromDate, to: toDate })}` : 'Chưa chọn'}
              </div>
            </div>
            
            <Calendar
              mode="range"
              onRangeSelect={(range) => {
                setFromDate(range?.from);
                setToDate(range?.to);
              }}
              numberOfMonths={numberOfMonths}
              className="rounded-md border bg-white"
            />
            
            {/* Quick actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={handleCustomClear}>
                Đặt lại
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>
                  Hủy
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={handleCustomApply}
                  disabled={!fromDate || !toDate}
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

