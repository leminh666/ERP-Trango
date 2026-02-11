/**
 * Standardized Metric Keys for ERP System
 * 
 * This file defines all metric keys used throughout the system.
 * Keys follow the pattern: {module}.{context}.{metric}
 * - module: wallet, order, workshopJob, report, cashbook
 * - context: summary, invoices, transfer, adjustment, items, payments, finance
 * - metric: specific metric name
 * 
 * RULES:
 * - Use camelCase (no accents/dashes)
 * - Keys are stable identifiers - do not change them casually
 * - Use meaningful names that describe what the metric represents
 */

export const METRIC_KEYS = {
  // =====================================
  // WALLET (Ví/Quỹ)
  // =====================================
  
  // Summary KPIs
  wallet_summary_totalIncome: 'wallet.summary.totalIncome',
  wallet_summary_totalExpense: 'wallet.summary.totalExpense',
  wallet_summary_net: 'wallet.summary.net',
  wallet_summary_balance: 'wallet.summary.balance',
  
  // Transaction lists in wallet detail
  wallet_invoices_incomeList: 'wallet.invoices.incomeList',
  wallet_invoices_expenseList: 'wallet.invoices.expenseList',
  
  // History sections
  wallet_transfer_list: 'wallet.transfer.list',
  wallet_adjustment_list: 'wallet.adjustment.list',
  
  // Category breakdowns (if still used)
  wallet_breakdown_incomeByCategory: 'wallet.breakdown.incomeByCategory',
  wallet_breakdown_expenseByCategory: 'wallet.breakdown.expenseByCategory',

  // =====================================
  // ORDER (Đơn hàng / Công trình)
  // =====================================
  
  // Finance summary KPIs
  order_summary_totalIncome: 'order.summary.totalIncome',
  order_summary_totalExpense: 'order.summary.totalExpense',
  order_summary_profit: 'order.summary.profit',
  order_summary_paid: 'order.summary.paid',
  order_summary_customerDebt: 'order.summary.customerDebt',
  
  // Finance tab lists
  order_finance_incomeList: 'order.finance.incomeList',
  order_finance_expenseList: 'order.finance.expenseList',
  
  // Items section
  order_items_total: 'order.items.total',
  order_items_list: 'order.items.list',
  
  // Pipeline/status
  order_pipeline_status: 'order.pipeline.status',

  // =====================================
  // WORKSHOP JOB (Phiếu gia công)
  // =====================================
  
  // Summary KPIs
  workshopJob_summary_total: 'workshopJob.summary.total',
  workshopJob_summary_paid: 'workshopJob.summary.paid',
  workshopJob_summary_debt: 'workshopJob.summary.debt',
  
  // Items section
  workshopJob_items_list: 'workshopJob.items.list',
  
  // Payments section
  workshopJob_payments_list: 'workshopJob.payments.list',
  
  // Status
  workshopJob_status: 'workshopJob.status',

  // =====================================
  // REPORT / DASHBOARD
  // =====================================
  
  // Cashflow reports
  report_cashflow_summary: 'report.cashflow.summary',
  report_cashflow_byMonth: 'report.cashflow.byMonth',
  report_cashflow_byWallet: 'report.cashflow.byWallet',
  report_cashflow_byCategory: 'report.cashflow.byCategory',
  
  // Profit/Loss reports
  report_profitLoss_summary: 'report.profitLoss.summary',
  report_profitLoss_byOrder: 'report.profitLoss.byOrder',
  
  // Accounts Receivable/Payable
  report_ar_ap_summary: 'report.arAp.summary',

  // =====================================
  // CASHFLOW (Báo cáo dòng tiền)
  // =====================================

  cashflow_totalIncome: 'cashflow.totalIncome',
  cashflow_totalExpense: 'cashflow.totalExpense',
  cashflow_adjustments: 'cashflow.adjustments',
  cashflow_net: 'cashflow.net',

  // =====================================
  // CASHBOOK (Sổ quỹ)
  // =====================================
  
  cashbook_totalIncome: 'cashbook.totalIncome',
  cashbook_totalExpense: 'cashbook.totalExpense',
  cashbook_net: 'cashbook.net',

  // =====================================
  // INCOME SLIP (Phiếu thu)
  // =====================================
  
  incomeSlip_totalAmount: 'incomeSlip.totalAmount',
  incomeSlip_count: 'incomeSlip.count',
  incomeSlip_average: 'incomeSlip.average',

  // =====================================
  // EXPENSE SLIP (Phiếu chi)
  // =====================================
  
  expenseSlip_totalAmount: 'expenseSlip.totalAmount',
  expenseSlip_count: 'expenseSlip.count',
  expenseSlip_average: 'expenseSlip.average',

  // =====================================
  // INCOME REPORT (Báo cáo thu)
  // =====================================
  
  incomeReport_total: 'incomeReport.total',
  incomeReport_categoryCount: 'incomeReport.categoryCount',
  incomeReport_averagePerCategory: 'incomeReport.averagePerCategory',
  incomeReport_byCategory: 'incomeReport.byCategory',
  incomeReport_dailySeries: 'incomeReport.dailySeries',

  // =====================================
  // EXPENSE REPORT (Báo cáo chi)
  // =====================================
  
  expenseReport_total: 'expenseReport.total',
  expenseReport_directTotal: 'expenseReport.directTotal',
  expenseReport_commonTotal: 'expenseReport.commonTotal',
  expenseReport_categoryCount: 'expenseReport.categoryCount',
  expenseReport_byCategory: 'expenseReport.byCategory',
  expenseReport_dailySeries: 'expenseReport.dailySeries',

  // =====================================
  // CUSTOMER (Khách hàng)
  // =====================================

  customer_summary_totalIncome: 'customer.summary.totalIncome',
  customer_summary_totalExpense: 'customer.summary.totalExpense',
  customer_summary_net: 'customer.summary.net',
  customer_summary_orderCount: 'customer.summary.orderCount',
  customer_summary_orderTotal: 'customer.summary.orderTotal',

  customer_orders_list: 'customer.orders.list',
  customer_transactions_income: 'customer.transactions.income',
  customer_transactions_expense: 'customer.transactions.expense',

  // =====================================
  // SUPPLIER (Nhà cung cấp)
  // =====================================

  supplier_summary_totalExpense: 'supplier.summary.totalExpense',
  supplier_summary_totalIncome: 'supplier.summary.totalIncome',
  supplier_summary_net: 'supplier.summary.net',
  supplier_summary_transactionCount: 'supplier.summary.transactionCount',

  supplier_transactions_expense: 'supplier.transactions.expense',
  supplier_transactions_income: 'supplier.transactions.income',

  // =====================================
  // WORKSHOP (Xưởng gia công)
  // =====================================

  workshop_summary_totalJobAmount: 'workshop.summary.totalJobAmount',
  workshop_summary_totalPaidAmount: 'workshop.summary.totalPaidAmount',
  workshop_summary_totalDebtAmount: 'workshop.summary.totalDebtAmount',
  workshop_summary_jobCount: 'workshop.summary.jobCount',
  workshop_summary_totalIncome: 'workshop.summary.totalIncome',
  workshop_summary_totalExpense: 'workshop.summary.totalExpense',

  workshop_jobs_list: 'workshop.jobs.list',
  workshop_payments_list: 'workshop.payments.list',
} as const;

// Type for metric keys - derived from the values of METRIC_KEYS
export type MetricKey = typeof METRIC_KEYS[keyof typeof METRIC_KEYS];

// Helper to check if a string is a valid metric key
export function isMetricKey(value: string): value is MetricKey {
  return Object.values(METRIC_KEYS).includes(value as MetricKey);
}

// Helper to get all metric keys for a specific module
export function getMetricKeysByModule(module: string): MetricKey[] {
  return Object.values(METRIC_KEYS).filter(key => 
    key.startsWith(`${module}.`)
  ) as MetricKey[];
}

// Module groupings
export const METRIC_MODULES = {
  WALLET: 'wallet',
  ORDER: 'order',
  WORKSHOP_JOB: 'workshopJob',
  REPORT: 'report',
  CASHBOOK: 'cashbook',
} as const;

export default METRIC_KEYS;

