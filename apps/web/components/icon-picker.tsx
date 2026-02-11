'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconPickerDialog } from './icon-picker-dialog';

interface IconPickerProps {
  value: string;
  onChange: (iconKey: string) => void;
  color?: string;
  onColorChange?: (color: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, color, onColorChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Preview / Open Dialog Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors w-full"
      >
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ backgroundColor: color || '#3b82f6' }}
        >
          {(() => {
            const Icon = (LucideIcons as any)[toPascalCase(value)] || LucideIcons.HelpCircle;
            return <Icon className="h-5 w-5 text-white" />;
          })()}
        </div>
        <div className="text-left">
          <p className="font-medium text-sm">{value || 'Chưa chọn icon'}</p>
          <p className="text-xs text-blue-600">Nhấp để thay đổi</p>
        </div>
      </button>

      {/* Dialog */}
      <IconPickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={onChange}
        currentIconKey={value}
        color={color}
        onColorChange={onColorChange}
      />
    </div>
  );
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

// Icon renderer component for displaying icons elsewhere
export function IconRenderer({ iconKey, color, className }: { iconKey: string; color?: string; className?: string }) {
  const Icon = (LucideIcons as any)[toPascalCase(iconKey)] || LucideIcons.HelpCircle;
  return (
    <div
      className={cn('flex items-center justify-center rounded-lg', className)}
      style={{ backgroundColor: color || '#e5e7eb' }}
    >
      <Icon className="h-5 w-5" style={{ color: color ? '#fff' : undefined }} />
    </div>
  );
}
