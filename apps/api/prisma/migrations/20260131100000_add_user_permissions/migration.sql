-- Migration: Add user permissions field
-- Created: 2026-01-31

-- Add permissions JSON column to User table
ALTER TABLE "User" ADD COLUMN "permissions" JSONB;

-- Grant SELECT on the column for the app role (if using Row Level Security)
-- Note: Adjust based on your actual PostgreSQL setup

-- Update existing ADMIN users to have full permissions
UPDATE "User"
SET "permissions" = '{
  "dashboard": { "view": true, "edit": true, "delete": true },
  "orders": { "view": true, "edit": true, "delete": true },
  "cashbook": { "view": true, "edit": true, "delete": true },
  "workshops": { "view": true, "edit": true, "delete": true },
  "fund": { "view": true, "edit": true, "delete": true },
  "catalog": { "view": true, "edit": true, "delete": true },
  "partners": { "view": true, "edit": true, "delete": true },
  "reports": { "view": true, "edit": true, "delete": true },
  "settings": { "view": true, "edit": true, "delete": true }
}'
WHERE "role" = 'ADMIN';

-- Update existing STAFF users to have limited permissions (can view, cannot edit/delete)
UPDATE "User"
SET "permissions" = '{
  "dashboard": { "view": true, "edit": false, "delete": false },
  "orders": { "view": true, "edit": false, "delete": false },
  "cashbook": { "view": true, "edit": false, "delete": false },
  "workshops": { "view": true, "edit": false, "delete": false },
  "fund": { "view": true, "edit": false, "delete": false },
  "catalog": { "view": true, "edit": false, "delete": false },
  "partners": { "view": true, "edit": false, "delete": false },
  "reports": { "view": true, "edit": false, "delete": false },
  "settings": { "view": false, "edit": false, "delete": false }
}'
WHERE "role" = 'STAFF' AND "permissions" IS NULL;

