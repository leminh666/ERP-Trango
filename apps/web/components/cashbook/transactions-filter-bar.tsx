'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TimeFilter, TimeFilterValue } from '@/components/time-filter';
import { Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  name: string;
}

interface CashbookTransactionsFilterBarProps {
  // Date range filter
  timeFilter: TimeFilterValue;
  onTimeFilterChange: (value: TimeFilterValue) => void;

  // Wallet filter
  walletId: string;
  onWalletIdChange: (value: string) => void;
  walletOptions: Option[];

  // Category filter
  categoryId: string;
  onCategoryIdChange: (value: string) => void;
  categoryOptions: Option[];

  // Search
  search: string;
  onSearchChange: (value: string) => void;

  // Extra left items (e.g., "Chi phí chung" checkbox for expense)
  extraLeft?: ReactNode;

  // Extra right items (e.g., "Hiện đã xóa" checkbox)
  extraRight?: ReactNode;

  // Advanced filter toggle
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;

  className?: string;
}

export function CashbookTransactionsFilterBar({
  timeFilter,
  onTimeFilterChange,
  walletId,
  onWalletIdChange,
  walletOptions,
  categoryId,
  onCategoryIdChange,
  categoryOptions,
  search,
  onSearchChange,
  extraLeft,
  extraRight,
  showAdvanced = false,
  onToggleAdvanced,
  className,
}: CashbookTransactionsFilterBarProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Main filters - responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Date Range - lg:col-span-3 */}
        <div className="lg:col-span-3 w-full">
          <TimeFilter 
            value={timeFilter} 
            onChange={onTimeFilterChange}
            className="w-full"
          />
        </div>

        {/* Wallet Select - lg:col-span-2 */}
        <div className="lg:col-span-2 w-full">
          <Select
            value={walletId}
            onChange={(e) => onWalletIdChange(e.target.value)}
            className="w-full"
          >
            <option value="all">Tất cả ví</option>
            {walletOptions.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </Select>
        </div>

        {/* Category Select - lg:col-span-2 */}
        <div className="lg:col-span-2 w-full">
          <Select
            value={categoryId}
            onChange={(e) => onCategoryIdChange(e.target.value)}
            className="w-full"
          >
            <option value="all">Tất cả danh mục</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        {/* Search - lg:col-span-3 */}
        <div className="lg:col-span-3 w-full relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm..."
            className="pl-9 h-9 w-full text-sm"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filter Button - lg:col-span-2 */}
        {onToggleAdvanced && (
          <div className="lg:col-span-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAdvanced}
              className={cn(
                'h-9 px-3 text-sm w-full md:w-auto',
                showAdvanced && 'bg-gray-100'
              )}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Lọc</span>
            </Button>
          </div>
        )}
      </div>

      {/* Advanced filters row */}
      {(showAdvanced || extraLeft || extraRight) && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3 pt-3 border-t">
          {/* Extra left items (e.g., "Chi phí chung") */}
          {extraLeft && (
            <div className="md:col-span-6 lg:col-span-6">
              {extraLeft}
            </div>
          )}

          {/* Extra right items (e.g., "Hiện đã xóa") */}
          {extraRight && (
            <div className={cn(
              'md:col-span-6 lg:col-span-6',
              !extraLeft && 'md:col-span-12 lg:col-span-12'
            )}>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {extraRight}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

