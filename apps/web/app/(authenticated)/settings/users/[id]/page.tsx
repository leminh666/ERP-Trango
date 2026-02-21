'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { apiClient }from '@/lib/api';
import { useToast } from '@/components/toast-provider';

interface UserItem {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  age?: number | null;
  address?: string | null;
  avatarUrl?: string | null;
  note?: string | null;
  role: 'ADMIN' | 'STAFF';
  permissions?: Record<string, { view: boolean; edit: boolean; delete: boolean }> | null;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Define all modules for permissions
const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'cashbook', label: 'Thu / Chi tiền' },
  { key: 'workshops', label: 'Xưởng gia công' },
  { key: 'fund', label: 'Sổ quỹ' },
  { key: 'catalog', label: 'Danh mục' },
  { key: 'partners', label: 'Đối tác' },
  { key: 'reports', label: 'Báo cáo' },
  { key: 'settings', label: 'Cài đặt' },
];

// Default permissions for STAFF
const DEFAULT_STAFF_PERMISSIONS: Record<string, { view: boolean; edit: boolean; delete: boolean }> = {
  dashboard: { view: true, edit: false, delete: false },
  orders: { view: true, edit: false, delete: false },
  cashbook: { view: true, edit: false, delete: false },
  workshops: { view: true, edit: false, delete: false },
  fund: { view: true, edit: false, delete: false },
  catalog: { view: true, edit: false, delete: false },
  partners: { view: true, edit: false, delete: false },
  reports: { view: true, edit: false, delete: false },
  settings: { view: false, edit: false, delete: false },
};

// Default permissions for ADMIN
const DEFAULT_ADMIN_PERMISSIONS: Record<string, { view: boolean; edit: boolean; delete: boolean }> = {
  dashboard: { view: true, edit: true, delete: true },
  orders: { view: true, edit: true, delete: true },
  cashbook: { view: true, edit: true, delete: true },
  workshops: { view: true, edit: true, delete: true },
  fund: { view: true, edit: true, delete: true },
  catalog: { view: true, edit: true, delete: true },
  partners: { view: true, edit: true, delete: true },
  reports: { view: true, edit: true, delete: true },
  settings: { view: true, edit: true, delete: true },
};

export default function SettingsUserProfilePage() {
  const { token, user: actor } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showSuccess, showError } = useToast();
  const [user, setUser] = useState<UserItem | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [confirmResetPassword, setConfirmResetPassword] = useState(false);

  // Permissions state
  const [permissions, setPermissions] = useState<Record<string, { view: boolean; edit: boolean; delete: boolean }>>({});

  useEffect(() => {
    if (token && id) {
      fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await apiClient<any>(`/users/${id}?includeDeleted=true`);

      if (!data || data?.error) {
        throw new Error(data?.message || 'Không tìm thấy nhân viên');
      }

      setUser(data);
      
      // Initialize permissions
      if (data.permissions) {
        setPermissions(data.permissions);
      } else if (data.role === 'ADMIN') {
        setPermissions(DEFAULT_ADMIN_PERMISSIONS);
      } else {
        setPermissions(DEFAULT_STAFF_PERMISSIONS);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      await apiClient(`/users/${id}/reset-password`, { method: 'POST' });
      setConfirmResetPassword(false);
      showSuccess('Đã reset mật khẩu về 123456');
    }catch (error) {
      console.error('Failed to reset password:', error);
      showError('Lỗi', error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  };

  const handlePermissionChange = (module: string, action: 'view' | 'edit' | 'delete', checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: checked,
      },
    }));
  };

  const handleSavePermissions = async () => {
    try {
      setSavingPermissions(true);
      setBanner(null);

      await apiClient(`/users/${id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      });

      setBanner({ type: 'success', message: 'Đã lưu phân quyền' });
    } catch (error) {
      console.error('Failed to save permissions:', error);
      setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi' });
    } finally {
      setSavingPermissions(false);
    }
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('vi-VN');
    } catch {
      return String(iso);
    }
  };

  const getInitials = (name: string) => {
    return name?.slice(0, 1)?.toUpperCase() || '?';
  };

  return (
    <AuthGuard requiredRoles={['ADMIN']}>
      <div>
        <PageHeader 
          title="Hồ sơ nhân viên" 
          description="Thông tin chi tiết và phân quyền nhân viên" 
          action={
            <Button variant="outline" onClick={() => router.push('/settings/users')}>
              ← Về danh sách
            </Button>
          }
        />

        {banner && (
          <div
            className={`mb-4 rounded-md border px-4 py-2 text-sm ${
              banner.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {banner.message}
          </div>
        )}

        {loading ? (
          <Card><CardContent className="pt-6">Đang tải...</CardContent></Card>
        ) : !user ? (
          <Card><CardContent className="pt-6">Không tìm thấy nhân viên.</CardContent></Card>
        ) : (
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">Thông tin nhân viên</TabsTrigger>
              <TabsTrigger value="permissions">Phân quyền</TabsTrigger>
            </TabsList>

            {/* Tab A: Thông tin nhân viên */}
            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-20 w-20 rounded-full object-cover border" />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-medium text-blue-600">
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-xl">{user.name}</CardTitle>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role === 'ADMIN' ? 'ADMIN' : 'STAFF'}
                        </span>
                        {user.deletedAt ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                            Đã xoá ({formatDate(user.deletedAt)})
                          </span>
                        ) : user.isActive ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            Tạm khoá
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t pt-4">
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-xs">SĐT:</span>
                      <span>{user.phone || '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-xs">Tuổi:</span>
                      <span>{user.age || '—'}</span>
                    </div>
                    <div className="flex flex-col md:col-span-2">
                      <span className="text-gray-500 text-xs">Địa chỉ:</span>
                      <span>{user.address || '—'}</span>
                    </div>
                    <div className="flex flex-col md:col-span-2">
                      <span className="text-gray-500 text-xs">Ghi chú:</span>
                      <span>{user.note || '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-xs">Ngày tạo:</span>
                      <span>{formatDate(user.createdAt)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-xs">Cập nhật cuối:</span>
                      <span>{formatDate(user.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6 border-t pt-4">
                    <Button onClick={() => router.push('/settings/users')}>Về danh sách</Button>
                    <Button variant="outline" onClick={() => setConfirmResetPassword(true)}disabled={user.id === actor?.id}>
                      Reset mật khẩu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab B: Phân quyền */}
            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle>Phân quyền module</CardTitle>
                  <p className="text-sm text-gray-500">
                    Chọn quyền Xem / Sửa / Xóa cho từng module. Nếu tắt quyền Xem, các quyền khác sẽ bị vô hiệu hoá.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="grid grid-cols-4 gap-4 font-medium text-sm border-b pb-2">
                      <div>Module</div>
                      <div className="text-center">Xem</div>
                      <div className="text-center">Sửa</div>
                      <div className="text-center">Xóa</div>
                    </div>
                    
                    {/* Modules */}
                    {MODULES.map((module) => {
                      const perms = permissions[module.key] || { view: false, edit: false, delete: false };
                      const canEdit = perms.view;
                      
                      return (
                        <div key={module.key} className="grid grid-cols-4 gap-4 items-center py-2 border-b last:border-0">
                          <div className="font-medium">{module.label}</div>
                          
                          {/* View */}
                          <div className="flex justify-center">
                            <Checkbox
                              checked={perms.view}
                              onCheckedChange={(checked) => handlePermissionChange(module.key, 'view', checked as boolean)}
                            />
                          </div>
                          
                          {/* Edit */}
                          <div className="flex justify-center">
                            <Checkbox
                              checked={perms.edit}
                              disabled={!canEdit}
                              onCheckedChange={(checked) => handlePermissionChange(module.key, 'edit', checked as boolean)}
                            />
                          </div>
                          
                          {/* Delete */}
                          <div className="flex justify-center">
                            <Checkbox
                              checked={perms.delete}
                              disabled={!canEdit}
                              onCheckedChange={(checked) => handlePermissionChange(module.key, 'delete', checked as boolean)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end mt-6 border-t pt-4">
                    <Button 
                      onClick={handleSavePermissions} 
                      disabled={savingPermissions || user.id === actor?.id}
                    >
                      {savingPermissions ? 'Đang lưu...' : 'Lưu phân quyền'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Confirm Reset Password Dialog */}
      {confirmResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Xác nhận reset mật khẩu?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Mật khẩu của <strong>{user?.name}</strong> sẽ được đặt lại về <strong>123456</strong>.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmResetPassword(false)}>Hủy</Button>
                <Button variant="destructive" onClick={handleResetPassword}>Xác nhận</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AuthGuard>
  );
}
