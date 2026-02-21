'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface MoneyInputProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  allowNegative?: boolean;
}

export function formatVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(amount));
}

export function parseMoney(value: string): number {
  if (!value || !value.trim()) return 0;
  const isNeg = value.trim().startsWith('-');
  const digits = value.replace(/[.,\s]/g, '').replace(/[^\d]/g, '');
  const num = parseFloat(digits);
  if (isNaN(num)) return 0;
  return isNeg ? -num : num;
}

export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className,
  required = false,
  allowNegative = false,
}: MoneyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      const num = Number(value);
      setDisplayValue(
        value !== null && value !== undefined && !isNaN(num) && num !== 0
          ? formatVnd(num)
          : ''
      );
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    const num = Number(value);
    setDisplayValue(
      value !== null && value !== undefined && !isNaN(num) && num !== 0
        ? String(num)
        : ''
    );
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const num = parseMoney(displayValue);
    const finalNum = allowNegative ? num : Math.abs(num);
    if (finalNum !== Number(value)) {
      onChange(finalNum);
    }
    setDisplayValue(finalNum !== 0 ? formatVnd(finalNum) : '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const pattern = allowNegative ? /[^\d.,-]/g : /[^\d.,]/g;
    setDisplayValue(raw.replace(pattern, ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={cn('text-right font-medium pr-8', className)}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none select-none">
        &#8363;
      </span>
    </div>
  );
}
