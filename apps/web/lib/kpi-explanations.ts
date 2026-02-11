/**
 * KPI Explanations Registry
 * 
 * This file contains explanations for all KPI metrics in the system.
 * Used by the InfoTooltip component to display contextual information.
 * 
 * Format:
 * - key: dot-notation path (module.metricName)
 * - title: Optional short title for the tooltip
 * - body: Content (string or ReactNode) explaining the metric
 * 
 * Keys follow the pattern: {module}.{metric}
 * Modules: wallet, order, workshopJob, cashbook, report
 */

import { ReactNode } from 'react';

// Helper for bullet lists
const bullet = (text: string) => `• ${text}`;
const ul = (items: string[]) => items.map(bullet).join('\n');

// =====================================================
// WALLET KPIs
// =====================================================

export const KPI_EXPLANATIONS: Record<string, { title?: string; body: string | ReactNode }> = {
  // --- Wallet KPIs ---
  'wallet.totalIncome': {
    title: 'Tổng thu',
    body: `Tổng tất cả Phiếu thu (INCOME) dùng ví này trong kỳ đang chọn.

${ul([
  'Chỉ tính giao dịch loại INCOME',
  'Không tính chuyển tiền nội bộ (TRANSFER)',
  'Không tính bản ghi đã xóa (deletedAt IS NOT NULL)',
  'Lọc theo ngày giao dịch (date)',
  'Đơn vị: VND'
])}`,
  },

  'wallet.totalExpense': {
    title: 'Tổng chi',
    body: `Tổng tất cả Phiếu chi (EXPENSE) dùng ví này trong kỳ đang chọn.

${ul([
  'Chỉ tính giao dịch loại EXPENSE',
  'Không tính chuyển tiền nội bộ (TRANSFER)',
  'Không tính bản ghi đã xóa',
  'Lọc theo ngày giao dịch (date)',
  'Đơn vị: VND'
])}`,
  },

  'wallet.net': {
    title: 'Thuần (Net)',
    body: `Số tiền thuần của ví = Tổng thu - Tổng chi + Điều chỉnh.

${ul([
  'Cộng tất cả Phiếu thu (INCOME)',
  'Trừ tất cả Phiếu chi (EXPENSE)',
  'Cộng Điều chỉnh số dư (mở ví, adjust)',
  'Không tính chuyển tiền nội bộ',
  'Công thức: Thu - Chi + Adjustments'
])}`,
  },

  'wallet.adjustments': {
    title: 'Điều chỉnh số dư',
    body: `Các bản ghi điều chỉnh số dư ví bao gồm:

${ul([
  'Số dư ban đầu (opening balance) khi tạo ví',
  'Điều chỉnh tăng/giảm thủ công',
  'Mỗi adjustment có thể là dương (tăng) hoặc âm (giảm)',
  'Không tính bản ghi đã xóa'
])}`,
  },

  'wallet.transfers': {
    title: 'Chuyển tiền nội bộ',
    body: `Lịch sử chuyển tiền giữa các ví trong hệ thống.

${ul([
  'Giao dịch chuyển đi (OUT): tiền ra khỏi ví này',
  'Giao dịch nhận về (IN): tiền vào ví này',
  'Chuyển tiền KHÔNG ảnh hưởng Tổng thu/Tổng chi',
  'Chuyển tiền CHỈ ảnh hưởng số dư ví'
])}`,
  },

  'wallet.balance': {
    title: 'Số dư hiện tại',
    body: `Số dư thực tế của ví tại thời điểm hiện tại.

${ul([
  'Tính theo: Tổng thu - Tổng chi + Tổng điều chỉnh',
  'Không bao gồm chuyển tiền nội bộ',
  'Cập nhật theo thời gian thực khi có giao dịch mới'
])}`,
  },

  // --- Order (Project) KPIs ---
  'order.totalIncome': {
    title: 'Tổng thu đơn hàng',
    body: `Tổng tiền thu từ đơn hàng này.

${ul([
  'Bao gồm: Đặt cọc, Thanh toán, Thu cuối',
  'Chỉ tính Phiếu thu (INCOME) có projectId = đơn hàng này',
  'Không tính bản ghi đã xóa'
])}`,
  },

  'order.totalExpense': {
    title: 'Tổng chi đơn hàng',
    body: `Tổng tiền chi cho đơn hàng này.

${ul([
  'Bao gồm: Chi phí thi công, vật tư, gia công...',
  'Chỉ tính Phiếu chi (EXPENSE) có projectId = đơn hàng này',
  'Chi phí chung (isCommonCost) không gắn đơn hàng'
])}`,
  },

  'order.profit': {
    title: 'Lợi nhuận đơn hàng',
    body: `Lợi nhuận thực của đơn hàng.

${ul([
  'Công thức: Tổng thu đơn - Tổng chi đơn',
  'Lợi nhuận dương = có lãi',
  'Lợi nhuận âm = lỗ',
  'Chưa bao gồm chi phí chung phân bổ'
])}`,
  },

  'order.financeSummary': {
    title: 'Tài chính đơn hàng',
    body: `Tổng hợp tài chính của đơn hàng.

${ul([
  'Tổng thu: Tất cả Phiếu thu gắn đơn hàng',
  'Tổng chi: Tất cả Phiếu chi gắn đơn hàng',
  'Lợi nhuận = Thu - Chi',
  'Không tính bản ghi đã xóa'
])}`,
  },

  // --- Workshop Job KPIs ---
  'workshopJob.total': {
    title: 'Tổng tiền gia công',
    body: `Tổng tiền gia công theo hợp đồng với xưởng.

${ul([
  'Bằng tổng (số lượng × đơn giá) các hạng mục',
  'Được thiết lập khi tạo Phiếu gia công',
  'Có thể chỉnh sửa nếu có thay đổi'
])}`,
  },

  'workshopJob.paid': {
    title: 'Đã thanh toán',
    body: `Tổng tiền đã thanh toán cho xưởng.

${ul([
  'Bao gồm: Các Phiếu chi loại thanh toán gia công',
  'Lọc theo workshopJobId = phiếu gia công này',
  'Cập nhật mỗi khi tạo phiếu chi thanh toán'
])}`,
  },

  'workshopJob.debt': {
    title: 'Còn nợ',
    body: `Số tiền còn phải thanh toán cho xưởng.

${ul([
  'Công thức: Tổng gia công - Đã thanh toán',
  'Dương = còn nợ xưởng',
  '0 = đã thanh toán đủ',
  'Không âm (không hoàn tiền lại)'
])}`,
  },

  'workshopJob.payments': {
    title: 'Lịch sử thanh toán',
    body: `Các lần thanh toán cho xưởng gia công.

${ul([
  'Liệt kê tất cả Phiếu chi thanh toán',
  'Sắp xếp theo thời gian giảm dần',
  'Hiện số tiền và ghi chú mỗi lần thanh toán'
])}`,
  },

  // --- Cashbook KPIs ---
  'cashbook.totalIncome': {
    title: 'Tổng thu',
    body: `Tổng thu toàn hệ thống trong kỳ.

${ul([
  'Tất cả Phiếu thu (INCOME)',
  'Lọc theo thời gian đang chọn',
  'Nhóm theo ví hoặc danh mục',
  'Không tính bản ghi đã xóa'
])}`,
  },

  'cashbook.totalExpense': {
    title: 'Tổng chi',
    body: `Tổng chi toàn hệ thống trong kỳ.

${ul([
  'Tất cả Phiếu chi (EXPENSE)',
  'Lọc theo thời gian đang chọn',
  'Nhóm theo ví hoặc danh mục',
  'Không tính bản ghi đã xóa'
])}`,
  },

  'cashbook.net': {
    title: 'Chênh lệch thu chi',
    body: `Chênh lệch thu - chi toàn hệ thống.

${ul([
  'Công thức: Tổng thu - Tổng chi',
  'Dương = thu > chi',
  'Âm = chi > thu',
  'Không bao gồm điều chỉnh số dư'
])}`,
  },

  // --- Report KPIs ---
  'report.cashflow': {
    title: 'Báo cáo dòng tiền',
    body: `Theo dõi biến động tiền mặt theo thời gian.

${ul([
  'Thể hiện qua các giao dịch Thu/Chi/Điều chỉnh',
  'Chuyển tiền nội bộ không tính vào dòng tiền',
  'Hiển thị xu hướng (tăng/giảm) theo ngày/tháng'
])}`,
  },

  'report.profit': {
    title: 'Báo cáo lợi nhuận',
    body: `Tổng hợp lợi nhuận theo đơn hàng/dự án.

${ul([
  'Lợi nhuận = Tổng thu - Tổng chi đơn hàng',
  'Chưa trừ chi phí chung phân bổ',
  'Có thể lọc theo giai đoạn đơn hàng'
])}`,
  },

  // --- Common/Generic ---
  'common.deleted': {
    title: 'Bản ghi đã xóa',
    body: `Các bản ghi đã bị xóa mềm (soft delete).

${ul([
  'Đánh dấu bằng deletedAt IS NOT NULL',
  'Không hiển thị trong danh sách mặc định',
  'Có thể khôi phục (restore) nếu cần',
  'Không tính vào KPI/tổng hợp'
])}`,
  },

  'common.filter': {
    title: 'Bộ lọc thời gian',
    body: `Lọc dữ liệu theo khoảng thời gian.

${ul([
  'Mặc định: Tháng hiện tại',
  'Có thể chọn: Tuần, Tháng, Năm, Tất cả',
  'Lọc theo ngày giao dịch (date)',
  'Áp dụng cho tất cả KPI trong trang'
])}`,
  },

  'common.amount': {
    title: 'Đơn vị tiền tệ',
    body: `Số tiền được hiển thị theo đơn vị VND.

${ul([
  'Format: 1.234.567 ₫',
  'Làm tròn đến hàng đơn vị',
  'Dữ liệu gốc lưu chính xác (Decimal)'
])}`,
  },
};

// Type for the registry
export type KpiExplanationKey = keyof typeof KPI_EXPLANATIONS;

export default KPI_EXPLANATIONS;

