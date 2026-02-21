import { z } from 'zod';

// === ENUMS (declared first for use in schemas) ===

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

export enum CustomerStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  CONSIDERING = 'CONSIDERING',
  PRICE_TOO_HIGH = 'PRICE_TOO_HIGH',
  APPOINTMENT_SET = 'APPOINTMENT_SET',
  SURVEY_SCHEDULED = 'SURVEY_SCHEDULED',
  WON = 'WON',
  LOST = 'LOST',
}

export enum FollowUpType {
  CALL = 'CALL',
  MEETING = 'MEETING',
  SURVEY = 'SURVEY',
  QUOTE = 'QUOTE',
  OTHER = 'OTHER',
}

export enum FollowUpOutcome {
  PENDING = 'PENDING',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum SourceChannel {
  FACEBOOK = 'FACEBOOK',
  TIKTOK = 'TIKTOK',
  WEBSITE = 'WEBSITE',
  ZALO = 'ZALO',
  INTRODUCED = 'INTRODUCED',
  REFERRAL = 'REFERRAL',
  WALK_IN = 'WALK_IN',
  OTHER = 'OTHER',
}

export enum WalletType {
  CASH = 'CASH',
  BANK = 'BANK',
  OTHER = 'OTHER',
}

export enum VisualType {
  ICON = 'ICON',
  IMAGE = 'IMAGE',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

// === INTERFACES ===

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export interface SystemSetting {
  id: string;
  key: string;
  valueJson: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  addressLine: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode: string | null;
  districtName: string | null;
  wardCode: string | null;
  wardName: string | null;
  status: CustomerStatus;
  lostReason: string | null;
  nextFollowUpAt: Date | null;
  nextFollowUpNote: string | null;
  ownerUserId: string | null;
  tags: string | null;
  note: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  // Phase 10: Source channel tracking
  sourceChannel: SourceChannel | null;
  sourceDetail: string | null;
  // Visual
  visualType: VisualType;
  iconKey: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  owner?: { id: string; name: string; email: string }| null;
  followUps?: CustomerFollowUp[];
  _count?: { followUps: number };
}

export interface CustomerFollowUp {
  id: string;
  customerId: string;
  type: FollowUpType;
  scheduledAt: Date;
  outcome: FollowUpOutcome;
  outcomeNote: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; name: string } | null;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  addressLine: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode: string | null;
  districtName: string | null;
  wardCode: string | null;
  wardName: string | null;
  note: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  visualType: VisualType;
  iconKey: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workshop {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  addressLine: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode: string | null;
  districtName: string | null;
  wardCode: string | null;
  wardName: string | null;
  note: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  visualType: VisualType;
  iconKey: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomeCategory {
  id: string;
  code: string;
  name: string;
  iconKey: string | null;
  color: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  visualType: VisualType;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  iconKey: string | null;
  color: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  visualType: VisualType;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  defaultSalePrice: number | null; // Kept for backward compatibility
  productType: 'CEILING_WOOD' | 'FURNITURE' | 'OTHER_ITEM';
  isActive: boolean;
  deletedAt: Date | null;
  visualType: VisualType;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations (optional)
  orderItems?: OrderItem[];
  attributeGroups?: ProductAttributeGroup[];
  variants?: ProductVariant[];
}

// === PRODUCT ATTRIBUTES & VARIANTS ===

export interface ProductAttributeGroup {
  id: string;
  name: string; // e.g., "Cấp trần", "Số mặt", "Chất liệu"
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  productId: string;
  product?: Product;
  values?: ProductAttributeValue[];
}

export interface ProductAttributeValue {
  id: string;
  value: string; // e.g., "2 cấp", "3 cấp", "Gỗ xoan"
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  groupId: string;
  group?: ProductAttributeGroup;
  parentValueId: string | null;
  parentValue?: ProductAttributeValue | null;
  variantAttributes?: ProductVariantAttribute[];
}

export interface ProductVariant {
  id: string;
  code: string | null; // SKU
  name: string; // Display name
  price: number | null;
  imageUrl: string | null; // Variant image
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  productId: string;
  product?: Product;
  attributes?: ProductVariantAttribute[];
}

export interface ProductVariantAttribute {
  id: string;
  // Relations
  variantId: string;
  variant?: ProductVariant;
  valueId: string;
  value?: ProductAttributeValue;
}

// === ORDER ITEMS (with variant support) ===

export interface OrderItem {
  id: string;
  projectId: string;
  productId: string | null;
  variantId: string | null; // Optional - if product has variants
  name: string; // Snapshot
  unit: string; // Snapshot
  qty: number;
  unitPrice: number;
  amount: number;
  note: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  product?: Product | null;
  variant?: ProductVariant | null;
  // Acceptance data (optional - added in Phase 11)
  acceptedQty: number | null;
  acceptedUnitPrice: number | null;
}

export interface ProjectSummary {
  projectId: string;
  itemCount: number;
  estimatedTotal: number;
}

export interface Wallet {
  id: string;
  code: string;
  name: string;
  type: WalletType;
  visualType: VisualType;
  iconKey: string | null;
  imageUrl: string | null;
  note: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  balance?: number;
  _count?: {
    transactions: number;
  };
}

export interface Transaction {
  id: string;
  code: string;
  type: TransactionType;
  date: Date;
  amount: number;
  note: string | null;
  walletId: string;
  wallet?: Wallet;
  incomeCategoryId: string | null;
  incomeCategory?: IncomeCategory;
  expenseCategoryId: string | null;
  expenseCategory?: ExpenseCategory;
  projectId: string | null;
  isCommonCost: boolean;
  supplierId: string | null;
  workshopId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  customerId: string | null;
  workshopId: string | null;
  address: string | null;
  stage: string;
  status: string;
  note: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Phase 9: Order Summary for /orders/list
export interface OrderSummary {
  projectId: string;
  code: string;
  name: string;
  customerName: string | null;
  workshopName: string | null;
  stage: string;
  status: string;
  estimatedTotal: number;
  incomeDeposit: number;
  incomePayment: number;
  incomeFinal: number;
  incomeTotal: number;
  expenseTotal: number;
  profitL1: number;
}

export interface WalletUsageSummary {
  walletId: string;
  period: { from: Date; to: Date };
  incomeByCategory: {
    incomeCategoryId: string | null;
    name: string;
    iconKey: string;
    color: string;
    totalAmount: number;
  }[];
  expenseByCategory: {
    expenseCategoryId: string | null;
    name: string;
    iconKey: string;
    color: string;
    totalAmount: number;
  }[];
  recentTransactions: {
    id: string;
    type: TransactionType;
    date: Date;
    amount: number;
    incomeCategoryName?: string;
    expenseCategoryName?: string;
    projectName?: string;
    projectId?: string;
    note?: string;
  }[];
}

// === ZOD SCHEMAS ===

export const UserRoleSchema = z.enum(['ADMIN', 'STAFF']);

export const CustomerStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'CONSIDERING',
  'PRICE_TOO_HIGH',
  'APPOINTMENT_SET',
  'SURVEY_SCHEDULED',
  'WON',
  'LOST',
]);

export const FollowUpTypeSchema = z.enum([
  'CALL',
  'MEETING',
  'SURVEY',
  'QUOTE',
  'OTHER',
]);

export const FollowUpOutcomeSchema = z.enum([
  'PENDING',
  'DONE',
  'CANCELLED',
  'NO_SHOW',
]);

export const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: UserRoleSchema,
  }),
});

export const CustomerCreateSchema = z.object({
  name: z.string().min(1, 'Tên khách hàng là bắt buộc'),
  phone: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  tags: z.string().optional(),
  note: z.string().optional(),
  ownerUserId: z.string().optional(),
});

export const CustomerUpdateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  status: CustomerStatusSchema.optional(),
  lostReason: z.string().optional(),
  tags: z.string().optional(),
  note: z.string().optional(),
  ownerUserId: z.string().optional(),
});

export const FollowUpCreateSchema = z.object({
  type: FollowUpTypeSchema,
  scheduledAt: z.string().min(1, 'Thời gian hẹn là bắt buộc'),
  outcomeNote: z.string().optional(),
});

export const SupplierCreateSchema = z.object({
  name: z.string().min(1, 'Tên nhà cung cấp là bắt buộc'),
  phone: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  note: z.string().optional(),
});

export const WorkshopCreateSchema = z.object({
  name: z.string().min(1, 'Tên xưởng là bắt buộc'),
  phone: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional(),
});

export const IncomeCategoryCreateSchema = z.object({
  name: z.string().min(1, 'Tên danh mục là bắt buộc'),
  visualType: z.nativeEnum(VisualType).default(VisualType.ICON),
  iconKey: z.string().optional(),
  imageUrl: z.string().optional(),
  color: z.string().optional(),
});

export const ExpenseCategoryCreateSchema = z.object({
  name: z.string().min(1, 'Tên danh mục là bắt buộc'),
  visualType: z.nativeEnum(VisualType).default(VisualType.ICON),
  iconKey: z.string().optional(),
  imageUrl: z.string().optional(),
  color: z.string().optional(),
});

export const ProductCreateSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm là bắt buộc'),
  unit: z.string().min(1, 'Đơn vị tính là bắt buộc'),
  productType: z.enum(['CEILING_WOOD', 'FURNITURE', 'OTHER_ITEM'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại sản phẩm' }),
  }),
  visualType: z.nativeEnum(VisualType).default(VisualType.ICON),
  iconKey: z.string().optional(),
  imageUrl: z.string().optional(),
  color: z.string().optional(),
});

export const WalletCreateSchema = z.object({
  name: z.string().min(1, 'Tên sổ quỹ là bắt buộc'),
  type: z.nativeEnum(WalletType).optional(),
  visualType: z.nativeEnum(VisualType).default(VisualType.ICON),
  iconKey: z.string().optional(),
  imageUrl: z.string().optional(),
  note: z.string().optional(),
});

export const TransactionCreateSchema = z.object({
  type: z.nativeEnum(TransactionType),
  date: z.string().min(1, 'Ngày là bắt buộc'),
  amount: z.number().min(0.01, 'Số tiền phải lớn hơn 0'),
  walletId: z.string().min(1, 'Ví là bắt buộc'),
  incomeCategoryId: z.string().optional(),
  expenseCategoryId: z.string().optional(),
  projectId: z.string().optional(),
  isCommonCost: z.boolean().optional(),
  note: z.string().optional(),
});

// === TYPE INFERENCES ===

export type LoginInput = z.infer<typeof LoginSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type UserRoleType = z.infer<typeof UserRoleSchema>;
export type CustomerStatusType = z.infer<typeof CustomerStatusSchema>;
export type FollowUpTypeType = z.infer<typeof FollowUpTypeSchema>;
export type FollowUpOutcomeType = z.infer<typeof FollowUpOutcomeSchema>;
export type CustomerCreateInput = z.infer<typeof CustomerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof CustomerUpdateSchema>;
export type FollowUpCreateInput = z.infer<typeof FollowUpCreateSchema>;
export type SupplierCreateInput = z.infer<typeof SupplierCreateSchema>;
export type WorkshopCreateInput = z.infer<typeof WorkshopCreateSchema>;
export type IncomeCategoryCreateInput = z.infer<typeof IncomeCategoryCreateSchema>;
export type ExpenseCategoryCreateInput = z.infer<typeof ExpenseCategoryCreateSchema>;
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;
export type WalletCreateInput = z.infer<typeof WalletCreateSchema>;
export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>;

// === PHASE 8: Dashboard Types ===

export interface DashboardDebtItem {
  id: string;
  name: string;
  phone: string | null;
  note?: string | null;
  debt: number;
}

export interface DashboardAdsByPlatform {
  platform: string;
  amount: number;
}

export interface DashboardData {
  revenueTotal: number;
  expenseTotal: number;
  profit: number;
  series: DashboardSeriesItem[];
  arTop: CustomerARItem[];
  apWorkshopTop: WorkshopAPItem[];
  apSupplierTop: SupplierAPItem[];
  // Extended debt fields
  customerDebtTotal?: number;
  customerDebts?: DashboardDebtItem[];
  workshopDebtTotal?: number;
  workshopDebts?: DashboardDebtItem[];
  supplierDebtTotal?: number;
  supplierDebts?: DashboardDebtItem[];
  // Ads analytics
  adsByPlatform?: DashboardAdsByPlatform[];
}

export interface DashboardSeriesItem {
  date: string;
  revenue: number;
  expense: number;
}

export interface CustomerARItem {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  followUpCount: number;
}

export interface WorkshopAPItem {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
}

export interface SupplierAPItem {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
}

// === PHASE 10: Report Types ===

// Income Report
export interface IncomeReportSummary {
  total: number;
  byCategory: Array<{
    incomeCategoryId: string;
    name: string;
    iconKey: string | null;
    color: string | null;
    totalAmount: number;
    percent: number;
  }>;
  series: Array<{
    date: string;
    amount: number;
  }>;
}

// Expense Report
export interface ExpenseReportSummary {
  total: number;
  directTotal: number;
  commonTotal: number;
  byCategory: Array<{
    expenseCategoryId: string;
    name: string;
    iconKey: string | null;
    color: string | null;
    totalAmount: number;
    percent: number;
  }>;
  series: Array<{
    date: string;
    amount: number;
  }>;
}

// Customer Regions Report
export interface CustomerRegionsReport {
  byRegion: Array<{
    region: string;
    customerCount: number;
    orderCount: number;
    revenueTotal: number;
    expenseTotal: number;
    profitL1: number;
  }>;
  topRegionsByCustomers: Array<{ region: string; customerCount: number }>;
  topRegionsByRevenue: Array<{ region: string; revenueTotal: number }>;
}

// Sales Channels Report
export interface SalesChannelsReport {
  byChannel: Array<{
    sourceChannel: SourceChannel;
    customerCount: number;
    orderCount: number;
    revenueTotal: number;
    expenseTotal: number;
    profitL1: number;
  }>;
  topChannelsByRevenue: Array<{ sourceChannel: SourceChannel; revenueTotal: number }>;
  topChannelsByCustomers: Array<{ sourceChannel: SourceChannel; customerCount: number }>;
}

// === PHASE 11: System Settings ===

export interface AiConfig {
  enabled: boolean;
  provider: 'mock' | 'openai';
  model: string;
  apiKey?: string;
  defaultWalletId?: string;
  defaultIncomeCategoryId?: string;
  defaultExpenseCategoryId?: string;
}

export interface ReminderScopes {
  cashbook: boolean;
  orders: boolean;
}

export interface ReminderConfig {
  enabled: boolean;
  timeWindows: string[]; // HH:mm format
  daysOfWeek: number[]; // 1=Monday, 7=Sunday
  graceMinutes: number;
  scopes: ReminderScopes;
}

export interface VoiceConfig {
  enabled: boolean;
  provider: 'browser';
  language: string;
  autoPunctuation: boolean;
  interimResults: boolean;
  maxSecondsPerSegment: number;
  pushToTalk: boolean;
}

export interface SystemSettings {
  ai: AiConfig;
  reminders: ReminderConfig;
  voice: VoiceConfig;
}

// === CRM MODULE ===

export enum CrmStage {
  LEAD = 'LEAD',
  QUOTED = 'QUOTED',
  CONSIDERING = 'CONSIDERING',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
  CANCELLED = 'CANCELLED',
}

export enum CrmActivityType {
  CALL = 'CALL',
  MEETING = 'MEETING',
  MESSAGE = 'MESSAGE',
  NOTE = 'NOTE',
  QUOTE = 'QUOTE',
  OTHER = 'OTHER',
}

export enum FollowUpStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  MISSED = 'MISSED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface CrmCustomer {
  id: string;
  customerId: string;
  stage: CrmStage;
  area: string | null;
  layout: string | null;
  style: string | null;
  architectureType: string | null;
  briefNote: string | null;
  ownerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer;
  ownerUser?: { id: string; name: string; email: string } | null;
  activities?: CrmActivity[];
  stageHistories?: CrmStageHistory[];
}

export interface CrmActivity {
  id: string;
  customerId: string;
  userId: string;
  type: CrmActivityType;
  outcome: string | null;
  note: string | null;
  createdAt: Date;
  nextFollowUpAt: Date | null;
  nextFollowUpNote: string | null;
  followUpStatus: FollowUpStatus;
  priority: Priority;
  user?: { id: string; name: string; email: string };
}

export interface CrmStageHistory {
  id: string;
  customerId: string;
  userId: string;
  fromStage: CrmStage | null;
  toStage: CrmStage;
  note: string | null;
  createdAt: Date;
  user?: { id: string; name: string; email: string };
}

export interface CrmScheduleItem {
  id: string;
  customerId: string;
  stage: CrmStage;
  area: string | null;
  layout: string | null;
  style: string | null;
  briefNote: string | null;
  ownerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: Customer;
  ownerUser?: { id: string; name: string; email: string } | null;
}

export interface CrmReport {
  totalLeads: number;
  stageDistribution: Record<string, number>;
  activitiesCount: number;
  totalFollowUps: number;
  conversionRates: {
    leadToQuoted: number;
    quotedToContract: number;
    leadToContract: number;
  };
  byUser: Array<{
    userId: string | null;
    user: { id: string; name: string; email: string } | null;
    count: number;
  }>;
}