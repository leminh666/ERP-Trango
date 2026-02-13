// =============================================================================
// Services Index - Single import point for all services
// =============================================================================
//
// Re-exports all service modules for easy importing.
//
// USAGE:
//   import { authService, orderService, productService } from '@/services';
//
// =============================================================================

// Auth Service
export { authService, authToken, type User, type LoginRequest, type LoginResponse } from './auth.service';

// Product/Catalog Service
export { productService, transactionItemService, type Product, type ProductCategory } from './product.service';

// Order Service
export { orderService, type Order, type OrderStatus, type OrderItem } from './order.service';

// Partner Service (Customers/Suppliers)
export { partnerService, type Partner, type PartnerCreate } from './partner.service';

// Workshop Service
export { workshopService, type WorkshopJob, type JobStatus } from './workshop.service';

// Financial Service (Wallets, Cashbook)
export { financialService, type Wallet, type Transaction, type CashflowSummary } from './financial.service';

