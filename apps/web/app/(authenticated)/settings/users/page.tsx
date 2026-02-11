'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiClient, uploadFile } from '@/lib/api';
import { AuthGuard } from '@/components/auth-guard';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

type FormState = {
  id?: string;
  email: string;
  password?: string;
  name: string;
  phone: string;
  age: string;
  address: string;
  note: string;
  role: 'ADMIN' | 'STAFF';
  avatarUrl: string;
};

export default function SettingsUsersPage() {
  const { token, user } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    name: '',
    phone: '',
    age: '',
    address: '',
    note: '',
    role: 'STAFF',
    avatarUrl: '',
  });

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, role, includeDeleted]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      if (includeDeleted) params.append('includeDeleted', 'true');

      const data = await apiClient<any[]>(`/users?${params.toString()}`);

      // apiClient throws on error, so we only get here if success
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setBanner({ type: 'error', message: 'Không tải được danh sách nhân viên hoặc không có quyền truy cập' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      email: '',
      password: '',
      name: '',
      phone: '',
      age: '',
      address: '',
      note: '',
      role: 'STAFF',
      avatarUrl: '',
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEdit(false);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
    setIsEdit(false);
  };

  const openEdit = (u: UserItem) => {
    setForm({
      id: u.id,
      email: u.email,
      password: '',
      name: u.name || '',
      phone: u.phone || '',
      age: u.age ? String(u.age) : '',
      address: u.address || '',
      note: u.note || '',
      role: u.role,
      avatarUrl: u.avatarUrl || '',
    });
    setAvatarFile(null);
    setAvatarPreview(u.avatarUrl || null);
    setShowModal(true);
    setIsEdit(true);
  };

  const uploadAvatarIfNeeded = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    const result = await uploadFile('/files/upload', avatarFile);
    return result.url || result.fileUrl || result.path || null;
  };

  const validateForm = () => {
    const errs: string[] = [];
    if (!form.email.trim()) errs.push('Email');
    if (!form.name.trim()) errs.push('Tên');
    if (!isEdit && form.password && form.password.length > 0 && form.password.length < 6) {
      errs.push('Mật khẩu (>= 6 ký tự)');
    }
    if (errs.length > 0) {
      setBanner({ type: 'error', message: `Thiếu/không hợp lệ: ${errs.join(', ')}` });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setBanner(null);

      const uploaded = await uploadAvatarIfNeeded();
      const avatarUrl = uploaded || form.avatarUrl || '';

      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        age: form.age.trim() ? Number(form.age) : null,
        address: form.address.trim() || null,
        note: form.note.trim() || null,
        role: form.role,
        avatarUrl: avatarUrl || null,
      };

      let url = '/users';
      let method: 'POST' | 'PUT' = 'POST';

      if (isEdit && form.id) {
        url = `/users/${form.id}`;
        method = 'PUT';
      } else {
        payload.email = form.email.trim();
        if (form.password && form.password.trim()) payload.password = form.password.trim();
      }

      await apiClient(url, {
        method,
        body: JSON.stringify(payload),
      });

      setShowModal(false);
      resetForm();
      setBanner({ type: 'success', message: isEdit ? 'Đã cập nhật nhân viên' : 'Đã tạo nhân viên mới' });
      await fetchUsers();
    } catch (error) {
      console.error('Failed to submit:', error);
      setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Có lỗi xảy ra' });
    }
  };

  const handleDelete = async (u: UserItem) => {
    if (!confirm(`Xoá nhân viên ${u.name}?`)) return;

    try {
      await apiClient(`/users/${u.id}`, { method: 'DELETE' });
      setBanner({ type: 'success', message: 'Đã xoá nhân viên' });
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete:', error);
      setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Xoá thất bại' });
    }
  };

  const handleRestore = async (u: UserItem) => {
    try {
      await apiClient(`/users/${u.id}/restore`, { method: 'POST' });
      setBanner({ type: 'success', message: 'Đã khôi phục nhân viên' });
      await fetchUsers();
    } catch (error) {
      console.error('Failed to restore:', error);
      setBanner({ type: 'error', message: error instanceof Error ? error.message : 'Khôi phục thất bại' });
    }
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('vi-VN');
    } catch {
      return String(iso);
    }
  };

  const filteredUsers = useMemo(() => users, [users]);

  return (
    <AuthGuard requiredRoles={['ADMIN']}>
      <div>
        <PageHeader title="Nhân viên" description="Quản lý tài khoản nhân viên (ADMIN)" />

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

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Search */}
              <div className="min-w-0">
                <label className="text-sm text-gray-500 mb-1 block">Tìm kiếm</label>
                <Input
                  placeholder="Tên / Email / SĐT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Role */}
              <div className="min-w-0">
                <label className="text-sm text-gray-500 mb-1 block">Vai trò</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="">Tất cả</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </div>

              {/* Include Deleted */}
              <div className="min-w-0">
                <label className="text-sm text-gray-500 mb-1 block">Hiện đã xoá</label>
                <Select value={includeDeleted ? 'true' : 'false'} onChange={(e) => setIncludeDeleted(e.target.value === 'true')}>
                  <option value="false">Không</option>
                  <option value="true">Có</option>
                </Select>
              </div>

              {/* Add Button */}
              <div>
                <Button onClick={openCreate}>Tạo nhân viên</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách nhân viên</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 border-b">
                    <th className="p-3 font-medium text-gray-600">Avatar</th>
                    <th className="p-3 font-medium text-gray-600">Họ tên</th>
                    <th className="p-3 font-medium text-gray-600">Email</th>
                    <th className="p-3 font-medium text-gray-600">SĐT</th>
                    <th className="p-3 font-medium text-gray-600">Vai trò</th>
                    <th className="p-3 font-medium text-gray-600">Trạng thái</th>
                    <th className="p-3 font-medium text-gray-600 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="p-6 text-center text-gray-500" colSpan={7}>Đang tải...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td className="p-6 text-center text-gray-500" colSpan={7}>Không có dữ liệu</td></tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className={`border-b hover:bg-gray-50 transition-colors ${u.deletedAt ? 'opacity-60 bg-gray-50' : ''}`}>
                        <td className="p-3">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="h-10 w-10 rounded-full object-cover border" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                              {u.name?.slice(0, 1)?.toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            className="text-blue-600 hover:underline font-medium"
                            onClick={() => router.push(`/settings/users/${u.id}`)}
                          >
                            {u.name}
                          </button>
                        </td>
                        <td className="p-3 text-gray-600">{u.email}</td>
                        <td className="p-3 text-gray-600">{u.phone || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          {u.deletedAt ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                              Đã xoá
                            </span>
                          ) : u.isActive ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                              Tạm khoá
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!u.deletedAt ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Sửa</Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(u)}
                                disabled={u.id === user?.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                Xoá
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleRestore(u)}>Khôi phục</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-xl">
              <CardHeader>
                <CardTitle>{isEdit ? 'Sửa nhân viên' : 'Tạo nhân viên'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEdit && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Email *</label>
                      <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Mật khẩu (optional)</label>
                      <Input
                        type="password"
                        value={form.password || ''}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Mặc định 123456"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tên *</label>
                    <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Vai trò</label>
                    <Select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as any }))}>
                      <option value="ADMIN">ADMIN</option>
                      <option value="STAFF">STAFF</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">SĐT</label>
                    <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tuổi</label>
                    <Input value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                  <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ghi chú</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md"
                    rows={2}
                    value={form.note}
                    onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Avatar</label>
                  <Input
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setAvatarFile(f);
                      if (f) {
                        const url = URL.createObjectURL(f);
                        setAvatarPreview(url);
                      } else {
                        setAvatarPreview(form.avatarUrl || null);
                      }
                    }}
                  />
                  {avatarPreview && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarPreview} alt="avatar" className="h-16 w-16 rounded-full border object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Hủy</Button>
                  <Button onClick={handleSubmit}>{isEdit ? 'Lưu' : 'Tạo'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

