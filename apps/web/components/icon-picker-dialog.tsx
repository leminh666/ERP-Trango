'use client';

import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { ICON_ALLOWLIST, ICON_GROUPS } from './icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface IconPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (iconKey: string) => void;
  currentIconKey?: string;
  color?: string;
  onColorChange?: (color: string) => void;
}

export function IconPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentIconKey,
  color,
  onColorChange,
}: IconPickerDialogProps) {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!search) return ICON_ALLOWLIST;
    return ICON_ALLOWLIST.filter((icon) =>
      icon.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  // Get icons for active group
  const groupIcons = useMemo(() => {
    if (!activeGroup) return [];
    return ICON_GROUPS[activeGroup as keyof typeof ICON_GROUPS] || [];
  }, [activeGroup]);

  const displayIcons = activeGroup ? groupIcons : filteredIcons;

  const toPascalCase = (str: string): string => {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chọn Icon</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Preview */}
          {currentIconKey && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ backgroundColor: color || '#3b82f6' }}
              >
                {(() => {
                  const Icon = (LucideIcons as any)[toPascalCase(currentIconKey)] || LucideIcons.HelpCircle;
                  return <Icon className="h-5 w-5 text-white" />;
                })()}
              </div>
              <div>
                <p className="font-medium text-sm">{currentIconKey}</p>
              </div>
            </div>
          )}

          {/* Search */}
          <Input
            placeholder="Tìm kiếm icon..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveGroup(null);
            }}
          />

          {/* Group tabs */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => {
                setActiveGroup(null);
                setSearch('');
              }}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md transition-colors',
                !activeGroup && !search ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
              )}
            >
              Tất cả
            </button>
            {Object.keys(ICON_GROUPS).map((group) => (
              <button
                key={group}
                onClick={() => {
                  setActiveGroup(group);
                  setSearch('');
                }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors capitalize',
                  activeGroup === group ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
                )}
              >
                {group === 'finance' ? 'Tài chính' :
                  group === 'building' ? 'Xây dựng' :
                    group === 'wood' ? 'Gỗ' :
                      group === 'arrows' ? 'Mũi tên' :
                        group === 'general' ? 'Chung' : group}
              </button>
            ))}
          </div>

          {/* Icon Grid */}
          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg">
            {displayIcons.map((iconKey) => {
              const Icon = (LucideIcons as any)[toPascalCase(iconKey)] || LucideIcons.HelpCircle;
              const isSelected = currentIconKey === iconKey;

              return (
                <button
                  key={iconKey}
                  onClick={() => onSelect(iconKey)}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg transition-all',
                    isSelected
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                      : 'bg-white border hover:bg-blue-50'
                  )}
                  title={iconKey}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>

          {/* Color picker */}
          {onColorChange && (
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Màu sắc</label>
              <div className="flex flex-wrap gap-2">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#64748b', '#000000'].map((c) => (
                  <button
                    key={c}
                    onClick={() => onColorChange(c)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      color === c ? 'border-gray-900 scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color || '#3b82f6'}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
