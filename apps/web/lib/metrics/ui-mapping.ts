/**
 * UI to MetricKey Mapping
 * 
 * This file maps UI components/pages to their corresponding metric keys.
 * Used as a reference for developers to quickly find the right metric key
 * when adding tooltips to the UI.
 * 
 * Usage:
 * - Find the page/section in this list
 * - Use the metricKey value in <KpiTooltip infoKey={...} />
 * - Or use <SectionTitle title="..." infoKey={...} />
 */

import { METRIC_KEYS, MetricKey } from './metric-keys';

interface UiMetricMapping {
  page: string;
  section: string;
  selectorHint: string;
  metricKey: MetricKey;
}

/**
 * Complete mapping of UI locations to metric keys
 * Use this as a reference when adding tooltips
 */
export const UI_METRIC_MAPPING: UiMetricMapping[] = [
  // =====================================
  // WALLET (Ví/Quỹ)
  // =====================================
  
  {
    page: 'WalletDetail',
    section: 'KPI Cards',
    selectorHint: 'KPI Tổng thu card',
    metricKey: METRIC_KEYS.wallet_summary_totalIncome,
  },
  {
    page: 'WalletDetail',
    section: 'KPI Cards',
    selectorHint: 'KPI Tổng chi card',
    metricKey: METRIC_KEYS.wallet_summary_totalExpense,
  },
  {
    page: 'WalletDetail',
    section: 'KPI Cards',
    selectorHint: 'KPI Thuần (Net) card',
    metricKey: METRIC_KEYS.wallet_summary_net,
  },
  {
    page: 'WalletDetail',
    section: 'KPI Cards',
    selectorHint: 'KPI Số dư hiện tại card (nếu có)',
    metricKey: METRIC_KEYS.wallet_summary_balance,
  },
  {
    page: 'WalletDetail',
    section: 'Transaction Lists',
    selectorHint: 'Khung Phiếu thu title',
    metricKey: METRIC_KEYS.wallet_invoices_incomeList,
  },
  {
    page: 'WalletDetail',
    section: 'Transaction Lists',
    selectorHint: 'Khung Phiếu chi title',
    metricKey: METRIC_KEYS.wallet_invoices_expenseList,
  },
  {
    page: 'WalletDetail',
    section: 'History Sections',
    selectorHint: 'Khung Chuyển tiền trong quỹ title',
    metricKey: METRIC_KEYS.wallet_transfer_list,
  },
  {
    page: 'WalletDetail',
    section: 'History Sections',
    selectorHint: 'Khung Điều chỉnh số dư title',
    metricKey: METRIC_KEYS.wallet_adjustment_list,
  },
  {
    page: 'WalletDetail',
    section: 'Breakdown Sections',
    selectorHint: 'Khung Thu theo danh mục title (nếu còn dùng)',
    metricKey: METRIC_KEYS.wallet_breakdown_incomeByCategory,
  },
  {
    page: 'WalletDetail',
    section: 'Breakdown Sections',
    selectorHint: 'Khung Chi theo danh mục title (nếu còn dùng)',
    metricKey: METRIC_KEYS.wallet_breakdown_expenseByCategory,
  },

  // =====================================
  // ORDER (Đơn hàng / Công trình)
  // =====================================
  
  {
    page: 'OrderDetail',
    section: 'Finance KPIs',
    selectorHint: 'KPI Tổng thu',
    metricKey: METRIC_KEYS.order_summary_totalIncome,
  },
  {
    page: 'OrderDetail',
    section: 'Finance KPIs',
    selectorHint: 'KPI Tổng chi',
    metricKey: METRIC_KEYS.order_summary_totalExpense,
  },
  {
    page: 'OrderDetail',
    section: 'Finance KPIs',
    selectorHint: 'KPI Lợi nhuận',
    metricKey: METRIC_KEYS.order_summary_profit,
  },
  {
    page: 'OrderDetail',
    section: 'Finance Tab',
    selectorHint: 'Khung Thu khách title',
    metricKey: METRIC_KEYS.order_finance_incomeList,
  },
  {
    page: 'OrderDetail',
    section: 'Finance Tab',
    selectorHint: 'Khung Chi công trình title',
    metricKey: METRIC_KEYS.order_finance_expenseList,
  },
  {
    page: 'OrderDetail',
    section: 'Items Section',
    selectorHint: 'Tổng giá trị hạng mục',
    metricKey: METRIC_KEYS.order_items_total,
  },
  {
    page: 'OrderDetail',
    section: 'Items Section',
    selectorHint: 'Khung Hạng mục/Sản phẩm title',
    metricKey: METRIC_KEYS.order_items_list,
  },
  {
    page: 'OrderDetail',
    section: 'Pipeline',
    selectorHint: 'Trạng thái pipeline',
    metricKey: METRIC_KEYS.order_pipeline_status,
  },

  // =====================================
  // WORKSHOP JOB (Phiếu gia công)
  // =====================================
  
  {
    page: 'WorkshopJobDetail',
    section: 'Summary KPIs',
    selectorHint: 'KPI Tổng tiền gia công',
    metricKey: METRIC_KEYS.workshopJob_summary_total,
  },
  {
    page: 'WorkshopJobDetail',
    section: 'Summary KPIs',
    selectorHint: 'KPI Đã thanh toán',
    metricKey: METRIC_KEYS.workshopJob_summary_paid,
  },
  {
    page: 'WorkshopJobDetail',
    section: 'Summary KPIs',
    selectorHint: 'KPI Công nợ còn lại',
    metricKey: METRIC_KEYS.workshopJob_summary_debt,
  },
  {
    page: 'WorkshopJobDetail',
    section: 'Items Section',
    selectorHint: 'Khung Hạng mục/Sản phẩm title',
    metricKey: METRIC_KEYS.workshopJob_items_list,
  },
  {
    page: 'WorkshopJobDetail',
    section: 'Payments Section',
    selectorHint: 'Khung Lịch sử thanh toán title',
    metricKey: METRIC_KEYS.workshopJob_payments_list,
  },
  {
    page: 'WorkshopJobDetail',
    section: 'Status',
    selectorHint: 'Trạng thái phiếu gia công',
    metricKey: METRIC_KEYS.workshopJob_status,
  },

  // =====================================
  // REPORT / DASHBOARD
  // =====================================
  
  {
    page: 'Dashboard',
    section: 'Cashflow Summary',
    selectorHint: 'Tổng quan dòng tiền',
    metricKey: METRIC_KEYS.report_cashflow_summary,
  },
  {
    page: 'Dashboard',
    section: 'KPI Cards',
    selectorHint: 'KPI Tổng doanh thu',
    metricKey: METRIC_KEYS.cashbook_totalIncome,
  },
  {
    page: 'Dashboard',
    section: 'KPI Cards',
    selectorHint: 'KPI Tổng chi phí',
    metricKey: METRIC_KEYS.cashbook_totalExpense,
  },
  {
    page: 'Dashboard',
    section: 'KPI Cards',
    selectorHint: 'KPI Lợi nhuận',
    metricKey: METRIC_KEYS.cashbook_net,
  },
  {
    page: 'Dashboard',
    section: 'Cashflow Charts',
    selectorHint: 'Biểu đồ dòng tiền theo tháng',
    metricKey: METRIC_KEYS.report_cashflow_byMonth,
  },
  {
    page: 'Dashboard',
    section: 'Cashflow Tables',
    selectorHint: 'Bảng theo ví',
    metricKey: METRIC_KEYS.report_cashflow_byWallet,
  },
  {
    page: 'Dashboard',
    section: 'Cashflow Tables',
    selectorHint: 'Breakdown theo danh mục',
    metricKey: METRIC_KEYS.report_cashflow_byCategory,
  },
  {
    page: 'ReportProfitLoss',
    section: 'Summary',
    selectorHint: 'Lãi/lỗ tổng',
    metricKey: METRIC_KEYS.report_profitLoss_summary,
  },
  {
    page: 'ReportProfitLoss',
    section: 'By Order',
    selectorHint: 'Lãi/lỗ theo công trình',
    metricKey: METRIC_KEYS.report_profitLoss_byOrder,
  },
  {
    page: 'ReportARAP',
    section: 'Summary',
    selectorHint: 'Công nợ',
    metricKey: METRIC_KEYS.report_ar_ap_summary,
  },

  // =====================================
  // CASHBOOK (Sổ quỹ)
  // =====================================
  
  {
    page: 'CashbookIncome',
    section: 'Summary',
    selectorHint: 'Tổng thu',
    metricKey: METRIC_KEYS.cashbook_totalIncome,
  },
  {
    page: 'CashbookExpense',
    section: 'Summary',
    selectorHint: 'Tổng chi',
    metricKey: METRIC_KEYS.cashbook_totalExpense,
  },
];

// =====================================
// HELPER FUNCTIONS
// =====================================

/**
 * Get all mappings for a specific page
 */
export function getMappingsByPage(page: string): UiMetricMapping[] {
  return UI_METRIC_MAPPING.filter(m => m.page === page);
}

/**
 * Get all mappings for a specific metric key
 */
export function getMappingsByKey(metricKey: MetricKey): UiMetricMapping[] {
  return UI_METRIC_MAPPING.filter(m => m.metricKey === metricKey);
}

/**
 * Get mapping by selector hint (fuzzy search)
 */
export function findMappingByHint(hint: string): UiMetricMapping | undefined {
  const lowerHint = hint.toLowerCase();
  return UI_METRIC_MAPPING.find(m => 
    m.selectorHint.toLowerCase().includes(lowerHint) ||
    m.section.toLowerCase().includes(lowerHint)
  );
}

/**
 * Get all metric keys used in the system
 */
export function getAllMetricKeys(): MetricKey[] {
  return Array.from(new Set(UI_METRIC_MAPPING.map(m => m.metricKey)));
}

/**
 * Get unique pages in the mapping
 */
export function getAllPages(): string[] {
  return Array.from(new Set(UI_METRIC_MAPPING.map(m => m.page)));
}

/**
 * Get unique sections for a page
 */
export function getSectionsByPage(page: string): string[] {
  return Array.from(new Set(UI_METRIC_MAPPING.filter(m => m.page === page).map(m => m.section)));
}

/**
 * Print a quick reference table (for debugging)
 */
export function printMetricReference(): void {
  console.log('='.repeat(80));
  console.log('METRIC KEY REFERENCE TABLE');
  console.log('='.repeat(80));
  console.log('');
  
  const pages = getAllPages();
  
  for (const page of pages) {
    const pageMappings = getMappingsByPage(page);
    console.log(`📄 ${page}`);
    console.log('-'.repeat(40));
    
    const sections = getSectionsByPage(page);
    for (const section of sections) {
      const sectionMappings = pageMappings.filter(m => m.section === section);
      console.log(`  📊 ${section}`);
      for (const mapping of sectionMappings) {
        console.log(`     • ${mapping.selectorHint}`);
        console.log(`       Key: ${mapping.metricKey}`);
      }
    }
    console.log('');
  }
}

export default UI_METRIC_MAPPING;

