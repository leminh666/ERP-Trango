import { redirect } from 'next/navigation';

// Dong tien da duoc gop vao trang Vi / Tai khoan
export default function CashflowRedirectPage() {
  redirect('/fund/wallets');
}

