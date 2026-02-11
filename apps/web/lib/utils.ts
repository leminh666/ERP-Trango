import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Vietnamese locale (VND)
 * Displays full format with thousand separators and "đ" suffix
 * Examples: 90100000 -> "90.100.000 đ", 272700000 -> "272.700.000 đ"
 */
export function formatCurrency(amount: number | bigint | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0 đ';
  }

  // Convert to number
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

  if (isNaN(num)) {
    return '0 đ';
  }

  // Format with Vietnamese locale (thousand separators using dots)
  const formatted = new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);

  return `${formatted} đ`;
}

/**
 * Format compact currency for charts (K, M, B suffixes)
 * Use this ONLY for chart axes where space is limited
 */
export function formatCompactCurrency(amount: number | bigint | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0';
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

  if (isNaN(num)) {
    return '0';
  }

  if (Math.abs(num) >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (Math.abs(num) >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }

  return num.toLocaleString('vi-VN');
}
