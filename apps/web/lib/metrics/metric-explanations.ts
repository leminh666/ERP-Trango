/**
 * Metric Explanations Registry - 100% Vietnamese Content
 * 
 * This file contains explanations for all metric keys in the system.
 * Format:
 * - meaning: Ý nghĩa của chỉ số (1-2 câu ngắn gọn)
 * - calculatedFrom: Tính từ những gì (bullet list)
 * - excludes: Không tính những gì (bullet list)
 * - formula: Công thức (nếu có)
 */

import { MetricKey } from './metric-keys';

type MetricExplanation = {
  title: string;
  description: string;
  includes?: string[];
  excludes?: string[];
  formula?: string;
};

export const METRIC_EXPLANATIONS: Record<MetricKey, MetricExplanation> = {
  // =====================================
  // WALLET (Ví/Quỹ)
  // =====================================
  
  'wallet.summary.totalIncome': {
    title: 'Tổng thu',
    description: 'Tổng tiền các phiếu thu trong khoảng thời gian đang chọn.',
    includes: [
      'Phiếu thu (tiền vào ví)',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Chuyển tiền nội bộ giữa các ví',
      'Phiếu chi',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng thu = Tổng số tiền phiếu thu'
  },

  'wallet.summary.totalExpense': {
    title: 'Tổng chi',
    description: 'Tổng tiền các phiếu chi trong khoảng thời gian đang chọn.',
    includes: [
      'Phiếu chi (tiền ra khỏi ví)',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Chuyển tiền nội bộ',
      'Phiếu thu',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng chi = Tổng số tiền phiếu chi'
  },

  'wallet.summary.net': {
    title: 'Thuần (Net)',
    description: 'Chênh lệch giữa tổng thu và tổng chi trong kỳ.',
    includes: [
      'Tổng thu của ví',
      'Tổng chi của ví',
      'Điều chỉnh số dư (mở ví, tăng/giảm thủ công)'
    ],
    excludes: [
      'Chuyển tiền nội bộ (chỉ chuyển ví, không ảnh hưởng Net)',
      'Bản ghi đã xóa'
    ],
    formula: 'Net = Tổng thu - Tổng chi + Điều chỉnh'
  },

  'wallet.summary.balance': {
    title: 'Số dư hiện tại',
    description: 'Số tiền thực có trong ví tại thời điểm này.',
    includes: [
      'Tất cả phiếu thu chưa xóa',
      'Tất cả phiếu chi chưa xóa',
      'Tất cả điều chỉnh số dư chưa xóa'
    ],
    excludes: [
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa'
    ],
    formula: 'Số dư = Thu - Chi + Điều chỉnh'
  },

  'wallet.invoices.incomeList': {
    title: 'Phiếu thu',
    description: 'Danh sách các phiếu thu đã sử dụng ví này.',
    includes: [
      'Tất cả phiếu thu của ví',
      'Hiển thị: ngày, danh mục, số tiền',
      'Sắp xếp theo ngày mới nhất'
    ],
    excludes: [
      'Phiếu thu đã xóa',
      'Phiếu chi, chuyển tiền'
    ]
  },

  'wallet.invoices.expenseList': {
    title: 'Phiếu chi',
    description: 'Danh sách các phiếu chi đã sử dụng ví này.',
    includes: [
      'Tất cả phiếu chi của ví',
      'Hiển thị: ngày, danh mục, số tiền',
      'Sắp xếp theo ngày mới nhất'
    ],
    excludes: [
      'Phiếu chi đã xóa',
      'Phiếu thu, chuyển tiền'
    ]
  },

  'wallet.transfer.list': {
    title: 'Chuyển tiền nội bộ',
    description: 'Lịch sử chuyển tiền giữa các ví trong hệ thống.',
    includes: [
      'Chuyển đi (tiền ra khỏi ví này)',
      'Nhận về (tiền vào ví này)',
      'Hiển thị số dư sau mỗi giao dịch'
    ],
    excludes: [
      'Phiếu thu, phiếu chi',
      'Bản ghi đã xóa'
    ],
    formula: 'Số dư sau = Số dư trước - Tiền chuyển đi (hoặc + Tiền nhận về)'
  },

  'wallet.adjustment.list': {
    title: 'Điều chỉnh số dư',
    description: 'Các bản ghi điều chỉnh số dư ví (bao gồm số dư ban đầu khi tạo ví).',
    includes: [
      'Số dư ban đầu khi tạo ví mới',
      'Điều chỉnh tăng/giảm thủ công',
      'Hiển thị số dư sau mỗi điều chỉnh'
    ],
    excludes: [
      'Bản ghi đã xóa',
      'Phiếu thu, phiếu chi, chuyển tiền'
    ]
  },

  // =====================================
  // ORDER (Đơn hàng / Công trình)
  // =====================================
  
  'order.summary.totalIncome': {
    title: 'Tổng thu đơn hàng',
    description: 'Tổng tiền thu từ đơn hàng này.',
    includes: [
      'Phiếu thu gắn đơn hàng (đặt cọc, thanh toán, thu cuối)',
      'Bản ghi chưa xóa'
    ],
    excludes: [
      'Phiếu thu không gắn đơn hàng',
      'Chi phí chung (không gắn đơn)',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng thu = Tổng số tiền phiếu thu gắn đơn'
  },

  'order.summary.totalExpense': {
    title: 'Tổng chi đơn hàng',
    description: 'Tổng chi phí của đơn hàng bao gồm gia công và chi phí trực tiếp.',
    includes: [
      'Tổng tiền phiếu gia công (workshop jobs)',
      'Phiếu chi gắn đơn hàng (không bao gồm phiếu chi gia công thanh toán xưởng)',
      'Bản ghi chưa xóa'
    ],
    excludes: [
      'Phiếu chi gia công (thanh toán cho xưởng - có workshopJobId)',
      'Chi phí chung (không gắn đơn)',
      'Phiếu thu',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng chi ĐH = Tổng tiền gia công + Phiếu chi gắn đơn (loại trừ phiếu chi gia công)'
  },

  'order.summary.profit': {
    title: 'Lợi nhuận đơn hàng',
    description: 'Lợi nhuận thực của đơn hàng (Thu - Chi).',
    includes: [
      'Tổng thu đơn hàng',
      'Tổng chi đơn hàng'
    ],
    excludes: [
      'Chi phí chung chưa phân bổ',
      'Bản ghi đã xóa'
    ],
    formula: 'Lợi nhuận = Tổng thu - Tổng chi'
  },

  'order.summary.paid': {
    title: 'Đã thanh toán',
    description: 'Số tiền khách đã thanh toán cho đơn hàng.',
    includes: [
      'Phiếu thu gắn đơn hàng (đặt cọc, thanh toán, thu cuối)',
      'Bản ghi chưa xóa'
    ],
    excludes: [
      'Phiếu thu không gắn đơn hàng',
      'Phiếu thu đã xóa hoặc hủy'
    ],
    formula: 'Đã thanh toán = Tổng số tiền phiếu thu gắn đơn'
  },

  'order.summary.customerDebt': {
    title: 'Công nợ khách hàng',
    description: 'Số tiền khách còn phải trả cho đơn hàng.',
    includes: [
      'Tổng đơn hàng (sau chiết khấu)',
      'Tiền đã thanh toán'
    ],
    excludes: [
      'Trường hợp trả thừa (hiển thị 0)'
    ],
    formula: 'Công nợ = Tổng ĐH - Đã thanh toán'
  },

  'order.finance.incomeList': {
    title: 'Thu khách',
    description: 'Danh sách các khoản thu từ đơn hàng này.',
    includes: [
      'Phiếu thu gắn đơn hàng',
      'Hiển thị: ngày, ví, số tiền, ghi chú'
    ],
    excludes: [
      'Phiếu thu không gắn đơn',
      'Bản ghi đã xóa'
    ]
  },

  'order.finance.expenseList': {
    title: 'Chi công trình',
    description: 'Danh sách các khoản chi cho đơn hàng này.',
    includes: [
      'Phiếu chi gắn đơn hàng',
      'Hiển thị: ngày, ví, số tiền, ghi chú'
    ],
    excludes: [
      'Chi phí chung (không gắn đơn)',
      'Bản ghi đã xóa'
    ]
  },

  // =====================================
  // WORKSHOP JOB (Phiếu gia công)
  // =====================================
  
  'workshopJob.summary.total': {
    title: 'Tổng tiền gia công',
    description: 'Tổng tiền gia công theo hợp đồng với xưởng.',
    includes: [
      'Tổng (số lượng × đơn giá) các hạng mục',
      'Giá trị thiết lập khi tạo phiếu gia công'
    ],
    excludes: [
      'Thay đổi sau khi tạo (nếu có)'
    ],
    formula: 'Tổng = Σ(Số lượng × Đơn giá) các hạng mục'
  },

  'workshopJob.summary.paid': {
    title: 'Đã thanh toán',
    description: 'Tổng tiền đã thanh toán cho xưởng.',
    includes: [
      'Phiếu chi thanh toán gia công',
      'Bản ghi chưa xóa'
    ],
    excludes: [
      'Phiếu chi không gắn xưởng gia công',
      'Bản ghi đã xóa'
    ],
    formula: 'Đã thanh toán = Tổng số tiền phiếu chi gắn phiếu gia công'
  },

  'workshopJob.summary.debt': {
    title: 'Công nợ còn lại',
    description: 'Số tiền còn phải thanh toán cho xưởng.',
    includes: [
      'Tổng tiền gia công',
      'Tiền đã thanh toán'
    ],
    excludes: [
      'Trường hợp thanh toán thừa (hiển thị 0)'
    ],
    formula: 'Còn nợ = Tổng gia công - Đã thanh toán'
  },

  'workshopJob.payments.list': {
    title: 'Lịch sử thanh toán',
    description: 'Các lần thanh toán cho xưởng gia công.',
    includes: [
      'Phiếu chi thanh toán gia công',
      'Hiển thị: ngày, số tiền, ghi chú',
      'Sắp xếp theo thời gian mới nhất'
    ],
    excludes: [
      'Phiếu chi không gắn xưởng',
      'Bản ghi đã xóa'
    ]
  },

  // =====================================
  // CASHFLOW (Báo cáo dòng tiền - Fund/Cashflow page)
  // =====================================

  'cashflow.totalIncome': {
    title: 'Tổng thu',
    description: 'Tổng tiền thu vào các ví trong kỳ đang chọn.',
    includes: [
      'Tất cả phiếu thu (type = INCOME)',
      'Trong khoảng thời gian chọn',
      'Bản ghi chưa xóa'
    ],
    excludes: [
      'Phiếu chi (EXPENSE)',
      'Chuyển tiền nội bộ (TRANSFER)',
      'Điều chỉnh số dư',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng thu = SUM(số tiền phiếu thu)'
  },

  'cashflow.totalExpense': {
    title: 'Tổng chi',
    description: 'Tổng tiền chi ra từ các ví trong kỳ đang chọn.',
    includes: [
      'Tất cả phiếu chi (type = EXPENSE)',
      'Trong khoảng thời gian chọn',
      'Bản ghi chưa xóa'
    ],
    excludes: [
      'Phiếu thu (INCOME)',
      'Chuyển tiền nội bộ (TRANSFER)',
      'Điều chỉnh số dư',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng chi = SUM(số tiền phiếu chi)'
  },

  'cashflow.adjustments': {
    title: 'Điều chỉnh',
    description: 'Tổng điều chỉnh số dư các ví trong kỳ đang chọn.',
    includes: [
      'Điều chỉnh tăng số dư (dương)',
      'Điều chỉnh giảm số dư (âm)',
      'Số dư ban đầu khi tạo ví mới',
      'Trong khoảng thời gian chọn',
      'Bản ghi chưa xóa'
    ],
    excludes: [
      'Phiếu thu, phiếu chi',
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa'
    ],
    formula: 'Điều chỉnh = SUM(tất cả adjustment)'
  },

  'cashflow.net': {
    title: 'Thuần (Net)',
    description: 'Chênh lệch thu - chi + điều chỉnh của các ví trong kỳ.',
    includes: [
      'Tổng thu',
      'Tổng chi',
      'Điều chỉnh số dư (cộng dương, trừ âm)'
    ],
    excludes: [
      'Chuyển tiền nội bộ (chỉ chuyển ví, không tính vào Net)',
      'Bản ghi đã xóa'
    ],
    formula: 'Net = Thu - Chi + Điều chỉnh'
  },

  // =====================================
  // REPORT / DASHBOARD
  // =====================================
  
  'report.cashflow.summary': {
    title: 'Tổng quan dòng tiền',
    description: 'Tổng hợp biến động tiền mặt trong kỳ đang chọn.',
    includes: [
      'Tổng thu',
      'Tổng chi',
      'Điều chỉnh số dư'
    ],
    excludes: [
      'Chuyển tiền nội bộ (chỉ chuyển ví)',
      'Bản ghi đã xóa'
    ]
  },

  'report.cashflow.byMonth': {
    title: 'Dòng tiền theo tháng',
    description: 'Biểu đồ biến động tiền mặt theo từng tháng.',
    includes: [
      'Tổng thu theo tháng',
      'Tổng chi theo tháng',
      'Chênh lệch (thu - chi) theo tháng'
    ],
    excludes: [
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa'
    ]
  },

  'cashbook.totalIncome': {
    title: 'Tổng thu',
    description: 'Tổng tiền thu toàn hệ thống trong kỳ đang chọn.',
    includes: [
      'Tất cả phiếu thu',
      'Trong khoảng thời gian chọn',
      'Bản ghi chưa xóa'
    ],
    excludes: [
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng thu = SUM(số tiền phiếu thu)'
  },

  'cashbook.totalExpense': {
    title: 'Tổng chi',
    description: 'Tổng tiền chi toàn hệ thống trong kỳ đang chọn.',
    includes: [
      'Tất cả phiếu chi',
      'Trong khoảng thời gian chọn',
      'Bản ghi chưa xóa'
    ],
    excludes: [
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng chi = SUM(số tiền phiếu chi)'
  },

  'cashbook.net': {
    title: 'Chênh lệch thu chi',
    description: 'Chênh lệch giữa tổng thu và tổng chi toàn hệ thống.',
    includes: [
      'Tổng thu',
      'Tổng chi'
    ],
    excludes: [
      'Điều chỉnh số dư',
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa'
    ],
    formula: 'Chênh lệch = Tổng thu - Tổng chi'
  },

  'report.profitLoss.summary': {
    title: 'Lãi/lỗ tổng',
    description: 'Tổng hợp lãi/lỗ toàn hệ thống.',
    includes: [
      'Thu - Chi theo từng công trình',
      'Tổng hợp toàn bộ'
    ],
    excludes: [
      'Chi phí chung chưa phân bổ',
      'Bản ghi đã xóa'
    ]
  },

  // =====================================
  // ADDITIONAL METRICS
  // =====================================
  
  'wallet.breakdown.incomeByCategory': {
    title: 'Thu theo danh mục',
    description: 'Tổng hợp thu theo từng danh mục.',
    includes: [
      'Phiếu thu nhóm theo danh mục thu',
      'Tính tổng theo từng danh mục'
    ],
    excludes: [
      'Phiếu thu không có danh mục',
      'Bản ghi đã xóa'
    ]
  },

  'wallet.breakdown.expenseByCategory': {
    title: 'Chi theo danh mục',
    description: 'Tổng hợp chi theo từng danh mục.',
    includes: [
      'Phiếu chi nhóm theo danh mục chi',
      'Tính tổng theo từng danh mục'
    ],
    excludes: [
      'Phiếu chi không có danh mục',
      'Bản ghi đã xóa'
    ]
  },

  'order.items.total': {
    title: 'Tổng giá trị hạng mục',
    description: 'Tổng giá trị các hạng mục trong đơn hàng.',
    includes: [
      'Tất cả hạng mục của đơn hàng',
      'Công thức: Số lượng × Đơn giá'
    ],
    excludes: [
      'Hạng mục đã xóa'
    ],
    formula: 'Tổng = Σ(Số lượng × Đơn giá)'
  },

  'order.items.list': {
    title: 'Hạng mục/Sản phẩm',
    description: 'Danh sách các hạng mục trong đơn hàng.',
    includes: [
      'Tất cả hạng mục của đơn',
      'Hiển thị: tên, đơn vị, số lượng, đơn giá'
    ],
    excludes: [
      'Hạng mục đã xóa'
    ]
  },

  'order.pipeline.status': {
    title: 'Trạng thái pipeline',
    description: 'Trạng thái hiện tại của đơn hàng.',
    includes: [
      'Các giai đoạn: Tiềm năng → Đã ký / Mất'
    ],
    excludes: []
  },

  'workshopJob.items.list': {
    title: 'Hạng mục/Sản phẩm',
    description: 'Danh sách hạng mục trong phiếu gia công.',
    includes: [
      'Tất cả hạng mục của phiếu',
      'Hiển thị: tên, số lượng, đơn giá, thành tiền'
    ],
    excludes: [
      'Hạng mục đã xóa'
    ]
  },

  'workshopJob.status': {
    title: 'Trạng thái phiếu gia công',
    description: 'Trạng thái hiện tại của phiếu gia công.',
    includes: [
      'Các trạng thái: Nháp → Đã gửi → Đang làm → Hoàn thành → Hủy'
    ],
    excludes: []
  },

  'report.cashflow.byWallet': {
    title: 'Dòng tiền theo ví',
    description: 'Tổng hợp dòng tiền theo từng ví.',
    includes: [
      'Tổng thu/chi theo từng ví',
      'Sắp xếp theo số dư hoặc tổng phát sinh'
    ],
    excludes: [
      'Ví đã xóa',
      'Bản ghi đã xóa'
    ]
  },

  'report.cashflow.byCategory': {
    title: 'Dòng tiền theo danh mục',
    description: 'Tổng hợp thu/chi theo danh mục.',
    includes: [
      'Tổng theo danh mục thu',
      'Tổng theo danh mục chi'
    ],
    excludes: [
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa'
    ]
  },

  'report.profitLoss.byOrder': {
    title: 'Lãi/lỗ theo công trình',
    description: 'Lãi/lỗ chi tiết theo từng công trình.',
    includes: [
      'Thu - Chi theo từng công trình'
    ],
    excludes: [
      'Công trình chưa có chi phí/thu',
      'Bản ghi đã xóa'
    ]
  },

  'report.arAp.summary': {
    title: 'Công nợ',
    description: 'Tổng hợp công nợ phải thu/phải trả.',
    includes: [
      'Tổng phải thu (chưa thu đủ từ khách)',
      'Tổng phải trả (chưa trả đủ cho NCC/xưởng)'
    ],
    excludes: []
  },

  // =====================================
  // INCOME SLIP (Phiếu thu)
  // =====================================

  'incomeSlip.totalAmount': {
    title: 'Tổng thu',
    description: 'Tổng tiền các phiếu thu trong khoảng thời gian đang chọn.',
    includes: [
      'Tất cả phiếu thu',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa',
      'Theo bộ lọc ví/danh mục (nếu có)'
    ],
    excludes: [
      'Phiếu thu đã xóa',
      'Phiếu thu ngoài khoảng thời gian',
      'Phiếu thu không khớp bộ lọc'
    ],
    formula: 'Tổng thu = SUM(số tiền phiếu thu)'
  },

  'incomeSlip.count': {
    title: 'Số phiếu',
    description: 'Tổng số phiếu thu trong khoảng thời gian đang chọn.',
    includes: [
      'Tất cả phiếu thu',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa',
      'Theo bộ lọc ví/danh mục (nếu có)'
    ],
    excludes: [
      'Phiếu thu đã xóa',
      'Phiếu thu ngoài khoảng thời gian'
    ],
    formula: 'Số phiếu = COUNT(phiếu thu)'
  },

  'incomeSlip.average': {
    title: 'Trung bình',
    description: 'Số tiền trung bình mỗi phiếu thu.',
    includes: [
      'Tổng thu',
      'Số phiếu thu'
    ],
    excludes: [],
    formula: 'Trung bình = Tổng thu / Số phiếu'
  },

  // =====================================
  // EXPENSE SLIP (Phiếu chi)
  // =====================================

  'expenseSlip.totalAmount': {
    title: 'Tổng chi',
    description: 'Tổng tiền các phiếu chi trong khoảng thời gian đang chọn.',
    includes: [
      'Tất cả phiếu chi',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa',
      'Theo bộ lọc ví/danh mục (nếu có)',
      'Chi phí chung và chi theo đơn (nếu không lọc)'
    ],
    excludes: [
      'Phiếu chi đã xóa',
      'Phiếu chi ngoài khoảng thời gian',
      'Phiếu chi không khớp bộ lọc'
    ],
    formula: 'Tổng chi = SUM(số tiền phiếu chi)'
  },

  'expenseSlip.count': {
    title: 'Số phiếu',
    description: 'Tổng số phiếu chi trong khoảng thời gian đang chọn.',
    includes: [
      'Tất cả phiếu chi',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa',
      'Theo bộ lọc ví/danh mục (nếu có)'
    ],
    excludes: [
      'Phiếu chi đã xóa',
      'Phiếu chi ngoài khoảng thời gian'
    ],
    formula: 'Số phiếu = COUNT(phiếu chi)'
  },

  'expenseSlip.average': {
    title: 'Trung bình',
    description: 'Số tiền trung bình mỗi phiếu chi.',
    includes: [
      'Tổng chi',
      'Số phiếu chi'
    ],
    excludes: [],
    formula: 'Trung bình = Tổng chi / Số phiếu'
  },

  // =====================================
  // INCOME REPORT (Báo cáo thu)
  // =====================================

  'incomeReport.total': {
    title: 'Tổng doanh thu',
    description: 'Tổng tiền thu toàn hệ thống trong khoảng thời gian đang chọn.',
    includes: [
      'Tất cả phiếu thu',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa',
      'Phiếu thu ngoài khoảng thời gian'
    ],
    formula: 'Tổng doanh thu = SUM(số tiền phiếu thu)'
  },

  'incomeReport.categoryCount': {
    title: 'Số danh mục thu',
    description: 'Số lượng danh mục thu có phát sinh trong kỳ.',
    includes: [
      'Các danh mục thu có ít nhất 1 phiếu thu',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Danh mục không có phiếu thu',
      'Bản ghi đã xóa'
    ],
    formula: 'Số danh mục = COUNT(DISTINCT danh mục thu)'
  },

  'incomeReport.averagePerCategory': {
    title: 'TB/Danh mục',
    description: 'Số tiền trung bình mỗi danh mục thu.',
    includes: [
      'Tổng doanh thu',
      'Số danh mục thu có phát sinh'
    ],
    excludes: [],
    formula: 'TB/Danh mục = Tổng doanh thu / Số danh mục'
  },

  'incomeReport.byCategory': {
    title: 'Thu theo danh mục',
    description: 'Tổng hợp thu theo từng danh mục thu.',
    includes: [
      'Tất cả danh mục thu có phát sinh',
      'Tổng tiền theo từng danh mục',
      'Tỷ trọng % của mỗi danh mục',
      'Trong khoảng thời gian đang chọn'
    ],
    excludes: [
      'Danh mục không có phiếu thu',
      'Bản ghi đã xóa'
    ],
    formula: 'Thu theo danh mục = GROUP BY danh mục, SUM(số tiền)'
  },

  'incomeReport.dailySeries': {
    title: 'Doanh thu theo ngày',
    description: 'Biểu đồ doanh thu theo từng ngày trong kỳ.',
    includes: [
      'Tổng thu theo từng ngày',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Ngày không có phiếu thu',
      'Bản ghi đã xóa'
    ]
  },

  // =====================================
  // EXPENSE REPORT (Báo cáo chi)
  // =====================================

  'expenseReport.total': {
    title: 'Tổng chi',
    description: 'Tổng tiền chi toàn hệ thống trong khoảng thời gian đang chọn.',
    includes: [
      'Tất cả phiếu chi',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa',
      'Chi theo đơn và chi phí chung (nếu không lọc)'
    ],
    excludes: [
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa',
      'Phiếu chi ngoài khoảng thời gian'
    ],
    formula: 'Tổng chi = SUM(số tiền phiếu chi)'
  },

  'expenseReport.directTotal': {
    title: 'Chi theo đơn',
    description: 'Tổng tiền chi trực tiếp cho các đơn hàng/dự án.',
    includes: [
      'Phiếu chi gắn đơn hàng',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Chi phí chung (không gắn đơn)',
      'Bản ghi đã xóa'
    ],
    formula: 'Chi theo đơn = SUM(phiếu chi có projectId)'
  },

  'expenseReport.commonTotal': {
    title: 'Chi phí chung',
    description: 'Tổng tiền chi phí vận hành chung (không gắn đơn hàng cụ thể).',
    includes: [
      'Phiếu chi không gắn đơn hàng',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Chi theo đơn hàng',
      'Bản ghi đã xóa'
    ],
    formula: 'Chi phí chung = SUM(phiếu chi không có projectId)'
  },

  'expenseReport.categoryCount': {
    title: 'Số danh mục',
    description: 'Số lượng danh mục chi có phát sinh trong kỳ.',
    includes: [
      'Các danh mục chi có ít nhất 1 phiếu chi',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Danh mục không có phiếu chi',
      'Bản ghi đã xóa'
    ],
    formula: 'Số danh mục = COUNT(DISTINCT danh mục chi)'
  },

  'expenseReport.byCategory': {
    title: 'Chi theo danh mục',
    description: 'Tổng hợp chi theo từng danh mục chi.',
    includes: [
      'Tất cả danh mục chi có phát sinh',
      'Tổng tiền theo từng danh mục',
      'Tỷ trọng % của mỗi danh mục',
      'Trong khoảng thời gian đang chọn'
    ],
    excludes: [
      'Danh mục không có phiếu chi',
      'Bản ghi đã xóa'
    ],
    formula: 'Chi theo danh mục = GROUP BY danh mục, SUM(số tiền)'
  },

  'expenseReport.dailySeries': {
    title: 'Chi phí theo ngày',
    description: 'Biểu đồ chi phí theo từng ngày trong kỳ.',
    includes: [
      'Tổng chi theo từng ngày',
      'Trong khoảng thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Ngày không có phiếu chi',
      'Bản ghi đã xóa'
    ]
  },

  // =====================================
  // CUSTOMER (Khách hàng)
  // =====================================

  'customer.summary.totalIncome': {
    title: 'Tổng thu',
    description: 'Tổng tiền thu từ khách hàng trong khoảng thời gian đang chọn.',
    includes: [
      'Phiếu thu gắn đơn hàng của khách hàng',
      'Phiếu thu gắn trực tiếp khách hàng (không qua đơn)',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Phiếu thu không gắn khách hàng',
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng thu = SUM(số tiền phiếu thu có customerId)'
  },

  'customer.summary.totalExpense': {
    title: 'Tổng chi',
    description: 'Tổng tiền chi cho khách hàng trong khoảng thời gian đang chọn.',
    includes: [
      'Phiếu chi gắn đơn hàng của khách hàng',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Chi phí chung (không gắn đơn/khách)',
      'Phiếu thu',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng chi = SUM(số tiền phiếu chi có project với customerId)'
  },

  'customer.summary.net': {
    title: 'Lợi nhuận',
    description: 'Chênh lệch thu - chi từ khách hàng trong kỳ.',
    includes: [
      'Tổng thu từ khách hàng',
      'Tổng chi cho đơn hàng của khách hàng'
    ],
    excludes: [
      'Chi phí chung chưa phân bổ',
      'Bản ghi đã xóa'
    ],
    formula: 'Lợi nhuận = Tổng thu - Tổng chi'
  },

  'customer.summary.orderCount': {
    title: 'Số đơn hàng',
    description: 'Tổng số đơn hàng của khách hàng trong khoảng thời gian đang chọn.',
    includes: [
      'Tất cả đơn hàng (Project) của khách hàng',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Đơn hàng đã xóa',
      'Đơn hàng ngoài khoảng thời gian'
    ],
    formula: 'Số đơn = COUNT(đơn hàng có customerId)'
  },

  'customer.summary.orderTotal': {
    title: 'Tổng giá trị đơn',
    description: 'Tổng giá trị các đơn hàng của khách hàng.',
    includes: [
      'Tổng (số lượng × đơn giá) các hạng mục trong đơn',
      'Đơn hàng trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Đơn hàng đã xóa',
      'Đơn hàng ngoài khoảng thời gian'
    ],
    formula: 'Tổng giá trị = SUM(tổng tiền đơn hàng)'
  },

  'customer.orders.list': {
    title: 'Đơn hàng',
    description: 'Danh sách các đơn hàng của khách hàng.',
    includes: [
      'Tất cả đơn hàng của khách hàng',
      'Hiển thị: mã, tên, giai đoạn, giá trị, ngày tạo',
      'Sắp xếp theo ngày tạo mới nhất'
    ],
    excludes: [
      'Đơn hàng đã xóa'
    ]
  },

  'customer.transactions.income': {
    title: 'Phiếu thu',
    description: 'Danh sách các phiếu thu từ khách hàng.',
    includes: [
      'Phiếu thu gắn đơn hàng của khách hàng',
      'Phiếu thu gắn trực tiếp khách hàng',
      'Hiển thị: ngày, mã, danh mục, ví, số tiền'
    ],
    excludes: [
      'Phiếu thu không gắn khách hàng',
      'Bản ghi đã xóa'
    ]
  },

  'customer.transactions.expense': {
    title: 'Phiếu chi',
    description: 'Danh sách các phiếu chi cho đơn hàng của khách hàng.',
    includes: [
      'Phiếu chi gắn đơn hàng của khách hàng',
      'Hiển thị: ngày, mã, danh mục, ví, số tiền'
    ],
    excludes: [
      'Chi phí chung (không gắn đơn)',
      'Bản ghi đã xóa'
    ]
  },

  // =====================================
  // SUPPLIER (Nhà cung cấp)
  // =====================================

  'supplier.summary.totalExpense': {
    title: 'Tổng mua hàng',
    description: 'Tổng tiền đã chi cho nhà cung cấp trong khoảng thời gian đang chọn.',
    includes: [
      'Phiếu chi gắn nhà cung cấp',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Phiếu thu',
      'Chuyển tiền nội bộ',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng mua = SUM(số tiền phiếu chi có supplierId)'
  },

  'supplier.summary.totalIncome': {
    title: 'Tổng bán lại',
    description: 'Tổng tiền thu từ nhà cung cấp (nếu có giao dịch bán lại).',
    includes: [
      'Phiếu thu gắn nhà cung cấp',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Phiếu chi',
      'Bản ghi đã xóa'
    ],
    formula: 'Tổng bán = SUM(số tiền phiếu thu có supplierId)'
  },

  'supplier.summary.net': {
    title: 'Chênh lệch',
    description: 'Chênh lệch giữa tiền bán lại và tiền mua từ nhà cung cấp.',
    includes: [
      'Tổng bán lại',
      'Tổng mua hàng'
    ],
    excludes: [
      'Bản ghi đã xóa'
    ],
    formula: 'Chênh lệch = Tổng bán - Tổng mua'
  },

  'supplier.summary.transactionCount': {
    title: 'Số giao dịch',
    description: 'Tổng số giao dịch với nhà cung cấp.',
    includes: [
      'Tất cả phiếu thu/chi gắn nhà cung cấp',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Bản ghi đã xóa'
    ],
    formula: 'Số giao dịch = COUNT(phiếu có supplierId)'
  },

  'supplier.transactions.expense': {
    title: 'Mua hàng',
    description: 'Danh sách các phiếu chi mua hàng từ nhà cung cấp.',
    includes: [
      'Phiếu chi gắn nhà cung cấp',
      'Hiển thị: ngày, mã, danh mục, ví, số tiền'
    ],
    excludes: [
      'Phiếu thu',
      'Bản ghi đã xóa'
    ]
  },

  'supplier.transactions.income': {
    title: 'Bán lại',
    description: 'Danh sách các phiếu thu từ nhà cung cấp (nếu có).',
    includes: [
      'Phiếu thu gắn nhà cung cấp',
      'Hiển thị: ngày, mã, danh mục, ví, số tiền'
    ],
    excludes: [
      'Phiếu chi',
      'Bản ghi đã xóa'
    ]
  },

  // =====================================
  // WORKSHOP (Xưởng gia công)
  // =====================================

  'workshop.summary.totalJobAmount': {
    title: 'Tổng gia công',
    description: 'Tổng tiền gia công theo các phiếu gia công với xưởng.',
    includes: [
      'Tổng (số lượng × đơn giá) các hạng mục trong phiếu gia công',
      'Phiếu gia công chưa xóa'
    ],
    excludes: [
      'Phiếu gia công đã xóa',
      'Thay đổi sau khi tạo (nếu có)'
    ],
    formula: 'Tổng gia công = SUM(tổng tiền phiếu gia công)'
  },

  'workshop.summary.totalPaidAmount': {
    title: 'Đã thanh toán',
    description: 'Tổng tiền đã thanh toán cho xưởng gia công.',
    includes: [
      'Phiếu chi thanh toán gia công',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Phiếu chi không gắn xưởng gia công',
      'Bản ghi đã xóa'
    ],
    formula: 'Đã thanh toán = SUM(số tiền phiếu chi gắn workshopId)'
  },

  'workshop.summary.totalDebtAmount': {
    title: 'Công nợ',
    description: 'Số tiền còn phải thanh toán cho xưởng gia công.',
    includes: [
      'Tổng tiền gia công',
      'Tiền đã thanh toán'
    ],
    excludes: [
      'Trường hợp thanh toán thừa (hiển thị 0)'
    ],
    formula: 'Công nợ = Tổng gia công - Đã thanh toán'
  },

  'workshop.summary.jobCount': {
    title: 'Số phiếu GC',
    description: 'Tổng số phiếu gia công với xưởng.',
    includes: [
      'Tất cả phiếu gia công',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Phiếu gia công đã xóa'
    ],
    formula: 'Số phiếu = COUNT(phiếu gia công có workshopId)'
  },

  'workshop.summary.totalIncome': {
    title: 'Thu khác',
    description: 'Tổng tiền thu khác từ xưởng gia công (nếu có).',
    includes: [
      'Phiếu thu gắn xưởng gia công',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Phiếu chi thanh toán gia công',
      'Bản ghi đã xóa'
    ],
    formula: 'Thu khác = SUM(số tiền phiếu thu có workshopId)'
  },

  'workshop.summary.totalExpense': {
    title: 'Chi thanh toán',
    description: 'Tổng tiền đã chi thanh toán cho xưởng gia công.',
    includes: [
      'Phiếu chi thanh toán gia công',
      'Trong thời gian đang chọn',
      'Bản ghi chưa bị xóa'
    ],
    excludes: [
      'Phiếu thu',
      'Bản ghi đã xóa'
    ],
    formula: 'Chi = SUM(số tiền phiếu chi gắn workshopId)'
  },

  'workshop.jobs.list': {
    title: 'Phiếu gia công',
    description: 'Danh sách các phiếu gia công với xưởng.',
    includes: [
      'Tất cả phiếu gia công của xưởng',
      'Hiển thị: mã, đơn hàng, trạng thái, tổng tiền, đã trả, còn nợ',
      'Sắp xếp theo ngày tạo mới nhất'
    ],
    excludes: [
      'Phiếu gia công đã xóa'
    ]
  },

  'workshop.payments.list': {
    title: 'Thanh toán',
    description: 'Danh sách các lần thanh toán cho xưởng gia công.',
    includes: [
      'Phiếu chi thanh toán gia công',
      'Hiển thị: ngày, mã, loại, ví, số tiền'
    ],
    excludes: [
      'Phiếu chi không gắn xưởng',
      'Bản ghi đã xóa'
    ]
  },
};

export default METRIC_EXPLANATIONS;
