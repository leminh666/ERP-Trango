'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MoneyInputProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

/**
 * Format a number to Vietnamese currency format (e.g., 1.000.000)
 */
export function formatVnd(amount: number): string {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse a string to number, handling various formats:
 * "1.000.000", "1,000,000", "1000000", ""
 */
export function parseMoney(value: string): number {
  if (!value || !value.trim()) return 0;
  
  // Remove all separators (dots, commas, spaces)
  const cleaned = value
    .replace(/[.,\s]/g, '')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (m) => '0123456789'[m.charCodeAt(0) - 0x2070]);
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className,
  required = false,
}: MoneyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update display value when value changes from outside
  useEffect(() => {
    if (!isFocused && value !== null && value !== undefined) {
      setDisplayValue(formatVnd(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number without formatting when focused
    setDisplayValue(value ? String(value) : '');
    // Select all text for easy editing
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const num = parseMoney(displayValue);
    
    // Only call onChange if the value actually changed
    if (num !== value) {
      onChange(num);
    }
    
    // Format for display
    if (num !== 0) {
      setDisplayValue(formatVnd(num));
    } else {
      setDisplayValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow only digits, dots, commas, and minus sign
    const cleaned = inputValue.replace(/[^\d.,\-\s]/g, '');
    
    // For display, convert commas to dots temporarily for parsing
    const tempForParse = cleaned.replace(/,/g, '.');
    // Remove multiple dots
    const normalized = tempForParse.replace(/\.{2,}/g, '.').replace(/\.(?=\d*\.)/g, '');
    
    // Update display
    setDisplayValue(cleaned);
    
    // Live parse for validation (optional, can be used to show error state)
    const num = parseMoney(cleaned);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow Enter to blur (submit form)
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'text-right font-medium pr-12',
          className
        )}
      />
      {!disabled && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          ₫
        </span>
      )}
    </div>
  );
}

