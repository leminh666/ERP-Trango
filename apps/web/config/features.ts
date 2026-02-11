/**
 * Feature Flags Configuration
 * Dùng để bật/tắt các module tạm thời
 *
 * Cách dùng:
 * - import { featureFlags } from '@/config/features';
 * - if (featureFlags.ENABLE_REMINDERS) { ... }
 *
 * Để bật module, set giá trị = true
 */

export const featureFlags = {
  // Module đang phát triển / tạm ẩn
  ENABLE_REMINDERS: false, // "Nhắc nhở" - đang phát triển sau
  ENABLE_PIPELINE_BOARD: true, // "Tiến độ" / Pipeline - đang hoạt động

  // UI Features
  ENABLE_DARK_MODE: false, // Chưa triển khai
  ENABLE_EXPORT_PDF: false, // Chưa triển khai
};

// Type cho feature flags
export type FeatureFlagKey = keyof typeof featureFlags;

/**
 * Helper để check feature có được bật không
 */
export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return featureFlags[key];
}

/**
 * Lấy tất cả feature flags (cho debug/admin)
 */
export function getAllFeatureFlags() {
  return { ...featureFlags };
}

