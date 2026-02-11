import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/components/toast-provider';
import './globals.css';
import { APP_NAME, APP_TITLE_SUFFIX, APP_DESCRIPTION } from '@/config/system';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: APP_NAME + APP_TITLE_SUFFIX,
    template: '%s' + APP_TITLE_SUFFIX,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

