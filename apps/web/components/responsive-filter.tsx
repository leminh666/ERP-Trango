'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, Search, X } from 'lucide-react';
import { DateInput }from '@/components/common/date-input';

interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

interface ResponsiveFilterProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onSearch?: () => void;
  onReset?: () => void;
  className?: string;
}

export function ResponsiveFilter({
  fields,
  values,
  onChange,
  onSearch,
  onReset,
  className,
}: ResponsiveFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const hasActiveFilters = Object.values(values).some(v => v && v !== '');

  // Check if all filters are empty
  const isEmpty = !hasActiveFilters;

  // Desktop Filter Content
  const FilterContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
      {fields.map((field) => (
        <div
          key={field.key}
          className={cn(
            field.type === 'text' ? 'lg:col-span-3' :
            field.type === 'daterange' ? 'lg:col-span-3' : 'lg:col-span-2',
            'w-full'
          )}
        >
          {field.type === 'text' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={field.placeholder || field.label}
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full h-9 pl-10 pr-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {field.type === 'select' && (
            <select
              value={values[field.key] || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full h-9 px-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{field.placeholder || `Tất cả ${field.label}`}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {field.type === 'daterange' && (
            <div className="flex items-center gap-2">
              <DateInput
                value={values[`${field.key}From`] || ''}
                onChange={(e) => onChange(`${field.key}From`, e.target.value)}
                className="w-full h-9 px-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">-</span>
              <DateInput
                value={values[`${field.key}To`] || ''}
                onChange={(e) => onChange(`${field.key}To`, e.target.value)}
                className="w-full h-9 px-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      ))}

      {/* Action buttons */}
      <div className="lg:col-span-2 flex justify-end gap-2">
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className={cn(hasActiveFilters ? '' : 'hidden')}
          >
            <X className="h-4 w-4 mr-1" />
            Đặt lại
          </Button>
        )}
        {onSearch && (
          <Button
            size="sm"
            onClick={() => {
              onSearch();
              setIsFilterOpen(false);
            }}
          >
            <Search className="h-4 w-4 mr-1" />
            Tìm kiếm
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop View - Inline filters */}
      <Card className={cn('hidden md:block', className)}>
        <CardContent className="p-3">
          <FilterContent />
        </CardContent>
      </Card>

      {/* Mobile View - Filter Summary + Sheet */}
      <div className={cn('md:hidden', className)}>
        {/* Filter Summary Bar */}
        <Card className="mb-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFilterOpen(true)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Lọc
                  {hasActiveFilters && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </Button>
                {hasActiveFilters && (
                  <span className="text-sm text-gray-500">
                    Đang áp dụng bộ lọc
                  </span>
                )}
              </div>
              {hasActiveFilters && onReset && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="text-gray-500"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filter Sheet/Drawer */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle>Bộ lọc</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-4">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>

                  {field.type === 'text' && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={field.placeholder || field.label}
                        value={values[field.key] || ''}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        className="w-full h-10 pl-10 pr-3 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {field.type === 'select' && (
                    <select
                      value={values[field.key] || ''}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      className="w-full h-10 px-3 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">{field.placeholder || `Tất cả ${field.label}`}</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'daterange' && (
                    <div className="space-y-2">
                      <DateInput
                        value={values[`${field.key}From`] || ''}
                        onChange={(e) => onChange(`${field.key}From`, e.target.value)}
                        className="w-full h-10 px-3 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <DateInput
                        value={values[`${field.key}To`] || ''}
                        onChange={(e) => onChange(`${field.key}To`, e.target.value)}
                        className="w-full h-10 px-3 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sticky Action Buttons */}
            <div className="sticky bottom-0 pt-4 border-t bg-white flex gap-2">
              <Button
                variant="outline"
                onClick={onReset}
                className="flex-1"
              >
                Đặt lại
              </Button>
              <Button
                onClick={() => {
                  onSearch?.();
                  setIsFilterOpen(false);
                }}
                className="flex-1"
              >
                Áp dụng
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

