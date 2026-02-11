'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Edit, Trash2, Eye } from 'lucide-react';

interface DataItem {
  id: string;
  [key: string]: any;
}

interface ColumnConfig {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'currency' | 'date' | 'status' | 'badge';
  width?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps {
  data: DataItem[];
  columns: ColumnConfig[];
  onRowClick?: (item: DataItem) => void;
  onEdit?: (item: DataItem) => void;
  onDelete?: (item: DataItem) => void;
  keyExtractor: string;
  emptyMessage?: string;
  loading?: boolean;
  // Financial fields for color coding
  financialFields?: {
    incomeField?: string;
    expenseField?: string;
    profitField?: string;
  };
}

export function ResponsiveTable({
  data,
  columns,
  onRowClick,
  onEdit,
  onDelete,
  keyExtractor,
  emptyMessage = 'Không có dữ liệu',
  loading = false,
  financialFields,
}: ResponsiveTableProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Loading state - use conditional rendering instead of early return to avoid hook issues
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Đang tải dữ liệu...
      </div>
    );
  }

  // Empty state - use conditional rendering
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const handleRowClick = (item: DataItem) => {
    const id = item[keyExtractor];
    setSelectedId(id === selectedId ? null : id);
    onRowClick?.(item);
  };

  // Mobile Card View
  const MobileCardView = () => (
    <div className="sm:hidden space-y-3">
      {data.map((item) => {
        const id = item[keyExtractor];
        const isSelected = selectedId === id;

        return (
          <Card
            key={id}
            className={cn(
              'transition-all cursor-pointer',
              isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
            )}
          >
            <CardContent className="p-4">
              {/* Header - Clickable to expand/collapse */}
              <div
                className="flex items-center justify-between"
                onClick={() => handleRowClick(item)}
              >
                <div className="flex-1 min-w-0">
                  {/* Main info from first column */}
                  {columns[0] && (
                    <div className="flex items-center gap-2">
                      {columns[0].format === 'status' ? (
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          item[columns[0].key]
                        )}>
                          {item[columns[0].label]}
                        </span>
                      ) : (
                        <p className="font-semibold text-gray-900 truncate">
                          {item[columns[0].key]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Second column as subtitle */}
                  {columns[1] && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {columns[1].format === 'currency'
                        ? formatCurrency(item[columns[1].key])
                        : item[columns[1].key]}
                    </p>
                  )}
                </div>

                <ChevronRight className={cn(
                  'h-5 w-5 text-gray-400 transition-transform',
                  isSelected && 'rotate-90'
                )} />
              </div>

              {/* Expanded Content */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  {/* Key Metrics */}
                  {financialFields && (
                    <div className="grid grid-cols-3 gap-2">
                      {financialFields.incomeField && (
                        <div className="text-center p-2 bg-green-50 rounded">
                          <p className="text-xs text-green-600">Thu</p>
                          <p className="font-semibold text-green-700">
                            {formatCurrency(item[financialFields.incomeField])}
                          </p>
                        </div>
                      )}
                      {financialFields.expenseField && (
                        <div className="text-center p-2 bg-red-50 rounded">
                          <p className="text-xs text-red-600">Chi</p>
                          <p className="font-semibold text-red-700">
                            {formatCurrency(item[financialFields.expenseField])}
                          </p>
                        </div>
                      )}
                      {financialFields.profitField && (
                        <div className={cn(
                          'text-center p-2 rounded',
                          item[financialFields.profitField] >= 0
                            ? 'bg-blue-50'
                            : 'bg-orange-50'
                        )}>
                          <p className={cn(
                            'text-xs',
                            item[financialFields.profitField] >= 0
                              ? 'text-blue-600'
                              : 'text-orange-600'
                          )}>
                            Lợi nhuận
                          </p>
                          <p className={cn(
                            'font-semibold',
                            item[financialFields.profitField] >= 0
                              ? 'text-blue-700'
                              : 'text-orange-700'
                          )}>
                            {formatCurrency(item[financialFields.profitField])}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other columns */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {columns.slice(2).map((col) => (
                      <div key={col.key}>
                        <p className="text-xs text-gray-500">{col.label}</p>
                        <p className={cn(
                          'font-medium truncate',
                          col.format === 'currency' && 'text-green-600'
                        )}>
                          {col.format === 'currency'
                            ? formatCurrency(item[col.key])
                            : col.format === 'status'
                            ? item[col.key]
                            : item[col.key] || '-'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick?.(item);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Xem chi tiết
                    </Button>
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                        className="hover:bg-blue-100"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Desktop Table View
  const DesktopTableView = () => (
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'text-left p-2 font-medium text-xs',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.hideOnMobile && 'hidden md:table-cell'
                )}
              >
                {col.label}
              </th>
            ))}
            <th className="text-left p-2 font-medium text-xs w-20">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const id = item[keyExtractor];
            const isSelected = selectedId === id;

            return (
              <tr
                key={id}
                className={cn(
                  'border-b hover:bg-gray-50 cursor-pointer transition-colors',
                  isSelected && 'bg-blue-50'
                )}
                onClick={() => handleRowClick(item)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'p-2',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.format === 'currency' && 'font-medium',
                      financialFields?.incomeField === col.key && 'text-green-600',
                      financialFields?.expenseField === col.key && 'text-red-600',
                      financialFields?.profitField === col.key && (
                        item[col.key] >= 0 ? 'text-green-600' : 'text-red-600'
                      ),
                      col.hideOnMobile && 'hidden md:table-cell'
                    )}
                  >
                    {col.format === 'currency'
                      ? formatCurrency(item[col.key])
                      : col.format === 'status'
                      ? item[col.key]
                      : item[col.key] || '-'}
                  </td>
                ))}
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                        className="hover:bg-blue-100"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <MobileCardView />
      <DesktopTableView />
    </>
  );
}

