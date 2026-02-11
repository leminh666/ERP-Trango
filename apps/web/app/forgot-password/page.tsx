'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      setMessage('Nếu tài khoản với email này tồn tại, một link đặt lại mật khẩu đã được gửi.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
          <CardDescription>Nhập email để đặt lại mật khẩu</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {message && (
              <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                {message}
              </div>
            )}
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            {!message && (
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@demo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            {!message && (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
              </Button>
            )}
            <Link href="/login" className="text-sm text-gray-500 hover:underline">
              ← Quay lại đăng nhập
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

