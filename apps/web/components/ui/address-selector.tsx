'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, X } from 'lucide-react';
import {
  provinces,
  searchProvinces,
  Province,
} from '@/lib/data/vietnam-addresses';

interface AddressSelectorProps {
  provinceCode?: string | null;
  provinceName?: string | null;
  districtCode?: string | null;
  districtName?: string | null;
  wardCode?: string | null;
  wardName?: string | null;
  addressLine?: string | null;
  onChange: (data: {
    provinceCode: string | null;
    provinceName: string | null;
    districtCode: string | null;
    districtName: string | null;
    wardCode: string | null;
    wardName: string | null;
    addressLine: string | null;
  }) => void;
  error?: {
    province?: string;
    district?: string;
    ward?: string;
  };
  required?: boolean;
}

export function AddressSelector({
  provinceCode,
  provinceName,
  districtCode,
  districtName,
  wardCode,
  wardName,
  addressLine,
  onChange,
  error,
  required = false,
}: AddressSelectorProps) {
  // Search states
  const [provinceSearch, setProvinceSearch] = useState('');

  // Dropdown visibility state
  const [showProvinces, setShowProvinces] = useState(false);

  // Filtered list based on search
  const filteredProvinces = useMemo(() => {
    if (!provinceSearch) return provinces;
    return searchProvinces(provinceSearch);
  }, [provinceSearch]);

  // Handlers
  const handleProvinceSelect = (province: Province) => {
    // Reset district and ward when province changes
    onChange({
      provinceCode: province.code,
      provinceName: province.name,
      districtCode: null,
      districtName: null,
      wardCode: null,
      wardName: null,
      addressLine: addressLine || '',
    });
    setProvinceSearch('');
    setShowProvinces(false);
  };

  const handleDistrictChange = (value: string) => {
    onChange({
      provinceCode: provinceCode || null,
      provinceName: provinceName || null,
      districtCode: null, // No code for manual input
      districtName: value,
      wardCode: wardCode || null,
      wardName: wardName || null,
      addressLine: addressLine || '',
    });
  };

  const handleWardChange = (value: string) => {
    onChange({
      provinceCode: provinceCode || null,
      provinceName: provinceName || null,
      districtCode: districtCode || null,
      districtName: districtName || null,
      wardCode: null, // No code for manual input
      wardName: value,
      addressLine: addressLine || '',
    });
  };

  const handleAddressLineChange = (value: string) => {
    onChange({
      provinceCode: provinceCode || null,
      provinceName: provinceName || null,
      districtCode: districtCode || null,
      districtName: districtName || null,
      wardCode: wardCode || null,
      wardName: wardName || null,
      addressLine: value,
    });
  };

  const handleClearAll = () => {
    onChange({
      provinceCode: null,
      provinceName: null,
      districtCode: null,
      districtName: null,
      wardCode: null,
      wardName: null,
      addressLine: '',
    });
    setProvinceSearch('');
  };

  // Close dropdowns when clicking outside
  const handleBackdropClick = () => {
    setShowProvinces(false);
  };

  return (
    <div className="space-y-4" onClick={handleBackdropClick}>
      {/* Address Line 1 - Street/Number */}
      <div>
        <Label className="block text-sm font-medium mb-1">
          {required && <span className="text-red-500 mr-1">*</span>}
          Địa chỉ (Số nhà, tên đường)
        </Label>
        <Input
          value={addressLine || ''}
          onChange={(e) => handleAddressLineChange(e.target.value)}
          placeholder="Ví dụ: 123 Nguyễn Trãi"
        />
      </div>

      {/* Province/City Dropdown */}
      <div className="relative">
        <Label className="block text-sm font-medium mb-1">
          {required && <span className="text-red-500 mr-1">*</span>}
          Tỉnh/Thành phố
        </Label>
        <div className="relative">
          <Input
            value={provinceName || provinceSearch}
            onChange={(e) => {
              setProvinceSearch(e.target.value);
              setShowProvinces(true);
            }}
            onFocus={() => setShowProvinces(true)}
            placeholder="Chọn Tỉnh/Thành phố"
            readOnly={!!provinceName && !provinceSearch}
            className={error?.province ? 'border-red-500' : ''}
          />
          {provinceName && (
            <button
              type="button"
              onClick={handleClearAll}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showProvinces && filteredProvinces.length > 0 && (
          <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto">
            <CardContent className="p-0">
              {filteredProvinces.map((province) => (
                <button
                  key={province.code}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => handleProvinceSelect(province)}
                >
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{province.name}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
        {error?.province && (
          <p className="text-sm text-red-500 mt-1">{error.province}</p>
        )}
      </div>

      {/* District Input */}
      <div>
        <Label className="block text-sm font-medium mb-1">
          {required && <span className="text-red-500 mr-1">*</span>}
          Quận/Huyện
        </Label>
        <Input
          value={districtName || ''}
          onChange={(e) => handleDistrictChange(e.target.value)}
          placeholder={provinceCode ? 'Nhập Quận/Huyện' : 'Chọn Tỉnh/TP trước'}
          disabled={!provinceCode}
          className={error?.district ? 'border-red-500' : ''}
        />
        {error?.district && (
          <p className="text-sm text-red-500 mt-1">{error.district}</p>
        )}
      </div>

      {/* Ward/Commune Input */}
      <div>
        <Label className="block text-sm font-medium mb-1">
          {required && <span className="text-red-500 mr-1">*</span>}
          Xã/Phường/Thị trấn
        </Label>
        <Input
          value={wardName || ''}
          onChange={(e) => handleWardChange(e.target.value)}
          placeholder={provinceCode ? 'Nhập Xã/Phường/Thị trấn' : 'Chọn Tỉnh/TP trước'}
          disabled={!provinceCode}
          className={error?.ward ? 'border-red-500' : ''}
        />
        {error?.ward && (
          <p className="text-sm text-red-500 mt-1">{error.ward}</p>
        )}
      </div>

      {/* Full Address Preview */}
      {(provinceName || districtName || wardName || addressLine) && (
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Địa chỉ đầy đủ:</span>{' '}
            {[
              addressLine,
              wardName,
              districtName,
              provinceName,
            ].filter(Boolean).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
