-- Script insert Products trực tiếp vào DB
-- Chạy trong pgAdmin hoặc psql sau khi đã migrate database

-- Xóa products cũ nếu muốn reset
-- DELETE FROM "OrderItem";
-- DELETE FROM "Product";

-- Insert Products (Trần gỗ - isCeilingWood = true)
INSERT INTO "Product" (id, code, name, unit, "defaultSalePrice", "isCeilingWood", "isActive", "deletedAt", "visualType", "imageUrl", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'SP0001', 'Trần gỗ óc chó', 'm2', 2500000.00, true, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0002', 'Trần gỗ sồi', 'm2', 1800000.00, true, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0003', 'Trần gỗ tếch', 'm2', 2200000.00, true, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0004', 'Trần gỗ xoan đào', 'm2', 1600000.00, true, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0005', 'Trần gỗ cao cấp gõ đỏ', 'm2', 3500000.00, true, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Insert Products (Phụ kiện - isCeilingWood = false)
INSERT INTO "Product" (id, code, name, unit, "defaultSalePrice", "isCeilingWood", "isActive", "deletedAt", "visualType", "imageUrl", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'SP0006', 'Keo dán gỗ chuyên dụng', 'thùng', 450000.00, false, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0007', 'Đinh bấm gỗ', 'hộp', 150000.00, false, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0008', 'Vít inox 3cm', 'hộp', 120000.00, false, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0009', 'Ray trượt ngăn kéo', 'bộ', 380000.00, false, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0010', 'Bản lề cửa gỗ', 'cái', 95000.00, false, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0011', 'Sơn lót gỗ chống mối', 'thùng', 680000.00, false, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW()),
  (gen_random_uuid(), 'SP0012', 'Sơn bóng gỗ ngoại thất', 'thùng', 1200000.00, false, true, NULL, 'IMAGE', '/placeholder-product.png', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Verify
SELECT code, name, "isCeilingWood", "defaultSalePrice" FROM "Product" ORDER BY code;

