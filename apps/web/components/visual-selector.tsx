'use client';

import { useState } from 'react';
import { VisualType } from '@tran-go-hoang-gia/shared';
import { IconPicker } from './icon-picker';
import { Image, Palette, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/toast-provider';

interface VisualSelectorProps {
  visualType: VisualType;
  iconKey: string | null;
  imageUrl: string | null;
  onVisualTypeChange: (type: VisualType) => void;
  onIconKeyChange: (key: string) => void;
  onImageUrlChange: (url: string) => void;
  color?: string;
  onColorChange?: (color: string) => void;
  className?: string;
}

export function VisualSelector({
  visualType,
  iconKey,
  imageUrl,
  onVisualTypeChange,
  onIconKeyChange,
  onImageUrlChange,
  color,
  onColorChange,
  className,
}: VisualSelectorProps) {
  const { showSuccess, showError } = useToast();
  const [showLogoUploader, setShowLogoUploader] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUploadLogo = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        onImageUrlChange(data.url);
        setShowLogoUploader(false);
        showSuccess('Thành công', 'Tải lên logo thành công');
      } else {
        showError('Upload thất bại', data.error || 'Vui lòng thử lại');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      showError('Upload thất bại', 'Có lỗi xảy ra khi tải lên');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Visual Type Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            onVisualTypeChange(VisualType.ICON);
            onImageUrlChange('');
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all',
            visualType === VisualType.ICON
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <Palette className="h-5 w-5" />
          <span className="font-medium">Dùng Icon</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onVisualTypeChange(VisualType.IMAGE);
            onIconKeyChange('');
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all',
            visualType === VisualType.IMAGE
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <Image className="h-5 w-5" />
          <span className="font-medium">Dùng Logo</span>
        </button>
      </div>

      {/* Icon Picker */}
      {visualType === VisualType.ICON && (
        <IconPicker
          value={iconKey || ''}
          onChange={onIconKeyChange}
          color={color}
          onColorChange={onColorChange}
        />
      )}

      {/* Logo Upload */}
      {visualType === VisualType.IMAGE && (
        <div className="space-y-3">
          {imageUrl ? (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
              <img src={imageUrl} alt="Logo" className="w-20 h-20 object-contain rounded-lg border" />
              <div className="flex-1">
                <p className="font-medium text-sm mb-2">Logo đã tải lên</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLogoUploader(true)}
                  >
                    Thay đổi
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onImageUrlChange('')}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => setShowLogoUploader(true)}
            >
              <Image className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500">Nhấp để tải lên logo</p>
              <p className="text-xs text-gray-400 mt-1">Chấp nhận: JPG, PNG, GIF, WebP (tối đa 5MB)</p>
            </div>
          )}
        </div>
      )}

      {/* Logo Uploader Modal */}
      {showLogoUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Tải lên logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="logo-upload"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleUploadLogo(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="logo-upload"
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors block"
              >
                {uploading ? (
                  <div className="text-blue-500">Đang tải lên...</div>
                ) : (
                  <>
                    <Image className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500">Nhấp để chọn file ảnh</p>
                    <p className="text-xs text-gray-400 mt-1">Chấp nhận: JPG, PNG, GIF, WebP (tối đa 5MB)</p>
                  </>
                )}
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLogoUploader(false)}
                >
                  Hủy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Visual Renderer Component
interface VisualRendererProps {
  visualType: VisualType;
  iconKey: string | null;
  imageUrl: string | null;
  color?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function VisualRenderer({
  visualType,
  iconKey,
  imageUrl,
  color,
  className,
  size = 'md',
}: VisualRendererProps) {
  if (visualType === VisualType.IMAGE && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn(sizeClasses[size], 'rounded-lg object-contain', className)}
      />
    );
  }

  // Fallback to icon
  const iconToUse = iconKey || 'help-circle';
  
  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-lg flex items-center justify-center',
        className
      )}
      style={{ backgroundColor: color || '#e5e7eb' }}
    >
      <IconDisplay iconKey={iconToUse} size={size} />
    </div>
  );
}

// Helper component to render icon
import * as LucideIcons from 'lucide-react';

function IconDisplay({ iconKey, size }: { iconKey: string; size: 'sm' | 'md' | 'lg' }) {
  const Icon = (LucideIcons as any)[toPascalCase(iconKey)] || LucideIcons.HelpCircle;
  return <Icon className={cn(iconSizeClasses[size], 'text-white')} />;
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
