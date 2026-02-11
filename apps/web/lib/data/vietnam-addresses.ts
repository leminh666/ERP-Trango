// Vietnam administrative divisions - Provinces/Cities data
// Standard Vietnamese administrative codes (Ma hanh chinh)

export interface Province {
  code: string;
  name: string;
  nameEn: string;
  type: 'thanh_pho' | 'tinh';
}

// Complete list of 63 provinces/cities
export const provinces: Province[] = [
  { code: '01', name: 'Hà Nội', nameEn: 'Ha Noi', type: 'thanh_pho' },
  { code: '02', name: 'Hà Giang', nameEn: 'Ha Giang', type: 'tinh' },
  { code: '04', name: 'Cao Bằng', nameEn: 'Cao Bang', type: 'tinh' },
  { code: '06', name: 'Bắc Kạn', nameEn: 'Bac Kan', type: 'tinh' },
  { code: '08', name: 'Tuyên Quang', nameEn: 'Tuyen Quang', type: 'tinh' },
  { code: '10', name: 'Lào Cai', nameEn: 'Lao Cai', type: 'tinh' },
  { code: '11', name: 'Điện Biên', nameEn: 'Dien Bien', type: 'tinh' },
  { code: '12', name: 'Lai Châu', nameEn: 'Lai Chau', type: 'tinh' },
  { code: '14', name: 'Sơn La', nameEn: 'Son La', type: 'tinh' },
  { code: '15', name: 'Yên Bái', nameEn: 'Yen Bai', type: 'tinh' },
  { code: '17', name: 'Hoà Bình', nameEn: 'Hoa Binh', type: 'tinh' },
  { code: '19', name: 'Thái Nguyên', nameEn: 'Thai Nguyen', type: 'tinh' },
  { code: '20', name: 'Lạng Sơn', nameEn: 'Lang Son', type: 'tinh' },
  { code: '22', name: 'Quảng Ninh', nameEn: 'Quang Ninh', type: 'tinh' },
  { code: '24', name: 'Bắc Giang', nameEn: 'Bac Giang', type: 'tinh' },
  { code: '25', name: 'Phú Thọ', nameEn: 'Phu Tho', type: 'tinh' },
  { code: '26', name: 'Vĩnh Phúc', nameEn: 'Vinh Phuc', type: 'tinh' },
  { code: '27', name: 'Bắc Ninh', nameEn: 'Bac Ninh', type: 'tinh' },
  { code: '30', name: 'Hải Dương', nameEn: 'Hai Duong', type: 'tinh' },
  { code: '31', name: 'Hải Phòng', nameEn: 'Hai Phong', type: 'thanh_pho' },
  { code: '33', name: 'Hưng Yên', nameEn: 'Hung Yen', type: 'tinh' },
  { code: '34', name: 'Thái Bình', nameEn: 'Thai Binh', type: 'tinh' },
  { code: '35', name: 'Hà Nam', nameEn: 'Ha Nam', type: 'tinh' },
  { code: '36', name: 'Nam Định', nameEn: 'Nam Dinh', type: 'tinh' },
  { code: '37', name: 'Ninh Bình', nameEn: 'Ninh Binh', type: 'tinh' },
  { code: '38', name: 'Thanh Hóa', nameEn: 'Thanh Hoa', type: 'tinh' },
  { code: '40', name: 'Nghệ An', nameEn: 'Nghe An', type: 'tinh' },
  { code: '42', name: 'Hà Tĩnh', nameEn: 'Ha Tinh', type: 'tinh' },
  { code: '44', name: 'Quảng Bình', nameEn: 'Quang Binh', type: 'tinh' },
  { code: '45', name: 'Quảng Trị', nameEn: 'Quang Tri', type: 'tinh' },
  { code: '46', name: 'Thừa Thiên Huế', nameEn: 'Thua Thien Hue', type: 'tinh' },
  { code: '48', name: 'Đà Nẵng', nameEn: 'Da Nang', type: 'thanh_pho' },
  { code: '49', name: 'Quảng Nam', nameEn: 'Quang Nam', type: 'tinh' },
  { code: '50', name: 'Quảng Ngãi', nameEn: 'Quang Ngai', type: 'tinh' },
  { code: '51', name: 'Cần Thơ', nameEn: 'Can Tho', type: 'thanh_pho' },
  { code: '52', name: 'Bình Định', nameEn: 'Binh Dinh', type: 'tinh' },
  { code: '54', name: 'Phú Yên', nameEn: 'Phu Yen', type: 'tinh' },
  { code: '56', name: 'Khánh Hòa', nameEn: 'Khanh Hoa', type: 'tinh' },
  { code: '58', name: 'Ninh Thuận', nameEn: 'Ninh Thuan', type: 'tinh' },
  { code: '60', name: 'Bình Thuận', nameEn: 'Binh Thuan', type: 'tinh' },
  { code: '62', name: 'Kon Tum', nameEn: 'Kon Tum', type: 'tinh' },
  { code: '64', name: 'Gia Lai', nameEn: 'Gia Lai', type: 'tinh' },
  { code: '66', name: 'Đắk Lắk', nameEn: 'Dak Lak', type: 'tinh' },
  { code: '68', name: 'Lâm Đồng', nameEn: 'Lam Dong', type: 'tinh' },
  { code: '70', name: 'Bình Phước', nameEn: 'Binh Phuoc', type: 'tinh' },
  { code: '72', name: 'Tây Ninh', nameEn: 'Tay Ninh', type: 'tinh' },
  { code: '74', name: 'Bình Dương', nameEn: 'Binh Duong', type: 'tinh' },
  { code: '75', name: 'Đồng Nai', nameEn: 'Dong Nai', type: 'tinh' },
  { code: '77', name: 'Bà Rịa - Vũng Tàu', nameEn: 'Ba Ria - Vung Tau', type: 'tinh' },
  { code: '79', name: 'Hồ Chí Minh', nameEn: 'Ho Chi Minh', type: 'thanh_pho' },
  { code: '80', name: 'Long An', nameEn: 'Long An', type: 'tinh' },
  { code: '82', name: 'Tiền Giang', nameEn: 'Tien Giang', type: 'tinh' },
  { code: '84', name: 'Bến Tre', nameEn: 'Ben Tre', type: 'tinh' },
  { code: '86', name: 'Trà Vinh', nameEn: 'Tra Vinh', type: 'tinh' },
  { code: '87', name: 'Vĩnh Long', nameEn: 'Vinh Long', type: 'tinh' },
  { code: '89', name: 'Hậu Giang', nameEn: 'Hau Giang', type: 'tinh' },
  { code: '91', name: 'Kiên Giang', nameEn: 'Kien Giang', type: 'tinh' },
  { code: '92', name: 'An Giang', nameEn: 'An Giang', type: 'tinh' },
  { code: '94', name: 'Đồng Tháp', nameEn: 'Dong Thap', type: 'tinh' },
  { code: '96', name: ' Sóc Trăng', nameEn: 'Soc Trang', type: 'tinh' },
  { code: '97', name: 'Bạc Liêu', nameEn: 'Bac Lieu', type: 'tinh' },
  { code: '98', name: 'Cà Mau', nameEn: 'Ca Mau', type: 'tinh' },
];

// Helper functions
export function getProvinceByCode(code: string): Province | undefined {
  return provinces.find(p => p.code === code);
}

export function searchProvinces(query: string): Province[] {
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return provinces.filter(p => {
    const nameNoDiacritics = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return nameNoDiacritics.includes(normalizedQuery) || 
           p.nameEn.toLowerCase().includes(query.toLowerCase()) ||
           p.code.includes(query);
  });
}
