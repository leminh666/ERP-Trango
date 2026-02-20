import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Warehouse,
  Wallet,
  Tags,
  Users,
  BarChart3,
  Settings,
  AlertCircle,
  ClipboardList,
  Building2,
  Truck,
  PieChart,
  Users as Users2,
  Store,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { UserRoleType } from '@tran-go-hoang-gia/shared';
import { featureFlags } from './features';

export interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  requiredRoles?: UserRoleType[];
  children?: MenuItem[];
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export const menuConfig: MenuGroup[] = [
  {
    title: '',
    items: [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
      },
    ],
  },
  {
    title: 'CRM - CSKH',
    items: [
      {
        label: 'Khách hàng',
        icon: UserCheck,
        href: '/crm/customers',
      },
      {
        label: 'Báo cáo Sale',
        icon: TrendingUp,
        href: '/crm/reports',
      },
    ],
  },
  {
    title: 'Đơn hàng',
    items: [
      {
        label: 'Danh sách đơn',
        icon: ShoppingCart,
        href: '/orders/list',
      },
      // Pipeline - renamed to Tiến độ
      {
        label: 'Tiến độ',
        icon: ClipboardList,
        href: '/orders/pipeline',
      },
    ].filter(item => {
      // Ẩn module Nhắc nhở nếu feature chưa được bật
      if (item.label === 'Nhắc nhở') {
        return featureFlags.ENABLE_REMINDERS;
      }
      return true;
    }),
  },
  {
    title: 'Thu / Chi',
    items: [
      {
        label: 'Phiếu thu',
        icon: FileText,
        href: '/cashbook/income',
      },
      {
        label: 'Phiếu chi',
        icon: FileText,
        href: '/cashbook/expense',
      },
    ],
  },
  {
    title: 'Xưởng gia công',
    items: [
      {
        label: 'Phiếu gia công',
        icon: Building2,
        href: '/workshops/jobs',
      },
    ],
  },
  {
    title: 'Sổ quỹ',
    items: [
      {
        label: 'Ví / Tài khoản',
        icon: Wallet,
        href: '/fund/wallets',
      },
      {
        label: 'Dòng tiền',
        icon: BarChart3,
        href: '/fund/cashflow',
      },
    ],
  },
  {
    title: 'Báo cáo',
    items: [
      {
        label: 'Báo cáo thu',
        icon: PieChart,
        href: '/reports/income',
      },
      {
        label: 'Báo cáo chi',
        icon: PieChart,
        href: '/reports/expense',
      },
      {
        label: 'Khách hàng theo vùng',
        icon: BarChart3,
        href: '/reports/customer-regions',
      },
    ],
  },
  {
    title: 'Danh mục',
    items: [
      {
        label: 'Nhà cung cấp',
        icon: Truck,
        href: '/partners/suppliers',
      },
      {
        label: 'Xưởng gia công',
        icon: Building2,
        href: '/partners/workshops',
      },
      {
        label: 'Sản phẩm',
        icon: Warehouse,
        href: '/catalog/products',
      },
      {
        label: 'Khoản thu',
        icon: Tags,
        href: '/catalog/income-items',
      },
      {
        label: 'Khoản chi',
        icon: Tags,
        href: '/catalog/expense-items',
      },
    ],
  },
  {
    title: 'Cài đặt',
    items: [
      {
        label: 'Hệ thống',
        icon: Settings,
        href: '/settings/system',
        requiredRoles: ['ADMIN'],
      },
      {
        label: 'Nhân viên',
        icon: Users,
        href: '/settings/users',
        requiredRoles: ['ADMIN'],
      },
      {
        label: 'Nhật ký hoạt động',
        icon: FileText,
        href: '/settings/audit',
        requiredRoles: ['ADMIN'],
      },
    ],
  },
];

// Helper function to check if user can access menu item
export function canAccessMenuItem(item: MenuItem, userRole?: string): boolean {
  if (!item.requiredRoles) return true;
  if (!userRole) return false;
  return item.requiredRoles.includes(userRole as UserRoleType);
}

// Helper function to get all accessible hrefs for a role
export function getAccessibleRoutes(role?: string): string[] {
  const routes: string[] = [];

  function traverse(items: MenuItem[]) {
    for (const item of items) {
      if (canAccessMenuItem(item, role)) {
        routes.push(item.href);
        if (item.children) {
          traverse(item.children);
        }
      }
    }
  }

  for (const group of menuConfig) {
    traverse(group.items);
  }

  return routes;
}

// Helper to check if a path is under /fund/*
export function isFundPage(pathname: string): boolean {
  return pathname.startsWith('/fund/');
}
