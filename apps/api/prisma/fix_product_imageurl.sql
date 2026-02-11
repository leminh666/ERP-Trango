-- Update NULL imageUrl values before schema change
UPDATE "Product" SET "imageUrl" = '/placeholder-product.png' WHERE "imageUrl" IS NULL;
