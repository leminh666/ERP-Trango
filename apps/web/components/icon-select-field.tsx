'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconPickerDialog } from './icon-picker-dialog';

interface IconSelectFieldProps {
  iconKey: string | null | undefined;
  color?: string;
  onIconKeyChange: (key: string) => void;
  onColorChange?: (color: string) => void;
  label?: string;
  className?: string;
}

export function IconSelectField({
  iconKey,
  color,
  onIconKeyChange,
  onColorChange,
  label = 'Icon',
  className,
}: IconSelectFieldProps) {
  const [open, setOpen] = useState(false);

  const toPascalCase = (str: string): string => {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  const handleSelect = (key: string) => {
    onIconKeyChange(key);
  };

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}

      <div className="flex items-center gap-4">
        {/* Preview / Select button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors min-w-[200px]"
        >
          {iconKey ? (
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{ backgroundColor: color || '#3b82f6' }}
            >
              {(() => {
                const Icon = (LucideIcons as any)[toPascalCase(iconKey)] || LucideIcons.HelpCircle;
                return <Icon className="h-5 w-5 text-white" />;
              })()}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <LucideIcons.ImagePlus className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div className="text-left">
            <p className="font-medium text-sm">
              {iconKey || 'Chưa chọn icon'}
            </p>
            <p className="text-xs text-gray-500">
              {iconKey ? 'Nhấp để thay đổi' : 'Nhấp để chọn icon'}
            </p>
          </div>
        </button>

        {/* Change icon button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          {iconKey ? 'Thay đổi' : 'Chọn icon'}
        </Button>
      </div>

      {/* Dialog */}
      <IconPickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
        currentIconKey={iconKey || undefined}
        color={color}
        onColorChange={onColorChange}
      />
    </div>
  );
}

