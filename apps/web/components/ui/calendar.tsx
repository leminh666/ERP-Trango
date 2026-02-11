'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CalendarProps {
  mode?: 'single' | 'range' | 'multiple';
  selected?: Date | Date[] | undefined;
  onSelect?: (date: Date | Date[] | undefined) => void;
  onRangeSelect?: (range: { from?: Date; to?: Date } | undefined) => void;
  className?: string;
  disabled?: boolean;
  numberOfMonths?: 1 | 2;
}

function Calendar({
  mode = 'single',
  selected,
  onSelect,
  onRangeSelect,
  className,
  numberOfMonths = 1,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected instanceof Date ? selected : new Date()
  );
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();
  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (mode === 'single') {
      onSelect?.(clickedDate);
    } else if (mode === 'range') {
      // For range mode, we'll call onRangeSelect with a simple object
      onRangeSelect?.({ from: clickedDate, to: clickedDate });
    } else if (mode === 'multiple') {
      const current = selected instanceof Array ? selected : [];
      const exists = current.find(d => d.getTime() === clickedDate.getTime());
      if (exists) {
        onSelect?.(current.filter(d => d.getTime() !== clickedDate.getTime()));
      } else {
        onSelect?.([...current, clickedDate]);
      }
    }
  };

  const renderMonth = (monthDate: Date) => {
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
      const isSelected = 
        (mode === 'single' && selected instanceof Date && selected.toDateString() === date.toDateString()) ||
        (mode === 'multiple' && selected instanceof Array && selected.some(d => d.toDateString() === date.toDateString()));
      const isToday = new Date().toDateString() === date.toDateString();
      const isPast = date > new Date();

      days.push(
        <button
          key={i}
          type="button"
          onClick={() => handleDateClick(i)}
          disabled={isPast && props.disabled}
          className={cn(
            'h-9 w-9 rounded-md text-sm font-medium transition-colors flex items-center justify-center',
            isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
            !isSelected && isToday && 'bg-accent font-semibold border border-primary/20',
            !isSelected && !isToday && 'hover:bg-accent',
            (isPast && props.disabled) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {i}
        </button>
      );
    }

    // Add empty cells for days before the first day of month
    const emptyCells = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      emptyCells.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    return (
      <div className="space-y-2">
        <div className="text-center font-medium text-sm">
          {monthNames[monthDate.getMonth()]} {monthDate.getFullYear()}
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {dayNames.map((name, i) => (
            <div key={i} className="text-xs text-muted-foreground py-1 font-medium">
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {emptyCells}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('p-2', className)} {...props}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 hover:bg-accent rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-sm font-medium">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 hover:bg-accent rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>
      {numberOfMonths === 2 ? (
        <div className="flex gap-4">
          {renderMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          {renderMonth(currentMonth)}
        </div>
      ) : (
        renderMonth(currentMonth)
      )}
    </div>
  );
}

export { Calendar };
