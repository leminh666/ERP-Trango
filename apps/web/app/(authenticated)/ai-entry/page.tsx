'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Wallet, IncomeCategory, ExpenseCategory, Project } from '@tran-go-hoang-gia/shared';
import { AiDraftModal } from '@/components/ai-draft-modal';
import { buildIncomeCreatePayload, buildExpenseCreatePayload } from '@/lib/transactions';
import { apiClient, getToken, buildApiUrl } from '@/lib/api';
import { useToast } from '@/components/toast-provider';

interface DraftData {
  type: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  walletId: string;
  incomeCategoryId?: string;
  expenseCategoryId?: string;
  projectId?: string;
  isCommonCost?: boolean;
  note: string;
  missingFields: string[];
}

type ModeHint = 'auto' | 'income' | 'expense';

type Banner = { type: 'success' | 'error'; message: string } | null;

export default function AiEntryPage() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [inputText, setInputText] = useState('');
  const [modeHint, setModeHint] = useState<ModeHint>('auto');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [draft, setDraft] = useState<DraftData | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const { showSuccess, showError, showWarning }= useToast();

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      fetchDropdowns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchDropdowns = async () => {
    try {
      const [walletData, incomeData, expenseData, projectData] = await Promise.all([
        apiClient<any[]>('/wallets'),
        apiClient<any[]>('/income-categories'),
        apiClient<any[]>('/expense-categories'),
        apiClient<any[]>('/projects?includeDeleted=false'),
      ]);

      setWallets(walletData.filter((w: any) => !w.deletedAt));
      setIncomeCategories(incomeData.filter((c: any) => !c.deletedAt));
      setExpenseCategories(expenseData.filter((c: any) => !c.deletedAt));
      setProjects(projectData.filter((p: any) => !p.deletedAt));
    } catch (error) {
      console.error('Failed to fetch dropdowns:', error);
      setBanner({ type: 'error', message: 'Không tải được dữ liệu dropdown' });
    }
  };

  const onPickFile = (file: File | null) => {
    setSelectedFile(file);
    setAttachmentUrl(null);
  };

  const uploadFileIfNeeded = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    const token = getToken();
    const form = new FormData();
    form.append('file', selectedFile);

    const uploadUrl = buildApiUrl('/files/upload');
    console.log('[AI Entry] Uploading to:', uploadUrl);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const data = await res.json();
    if (!res.ok || data?.error) {
      throw new Error(data?.error || 'Upload failed');
    }

    // FilesService usually returns { url } or { fileUrl } - be tolerant
    return data.url || data.fileUrl || data.path || null;
  };

  const handleCreateDraft = async () => {
    if (!inputText.trim() && !selectedFile) {
      setBanner({ type: 'error', message: 'Vui lòng dán nội dung hoặc chọn file' });
      return;
    }

    setBanner(null);
    setIsCreatingDraft(true);

    try {
      const uploadedUrl = await uploadFileIfNeeded();
      setAttachmentUrl(uploadedUrl);

      const result = await apiClient<any>('/ai/parse-transaction', {
        method: 'POST',
        body: JSON.stringify({
          text: inputText,
          modeHint,
          attachmentUrls: uploadedUrl ? [uploadedUrl] : [],
        }),
      });

      const nextDraft: DraftData = {
        type: result.type,
        date: result.date || new Date().toISOString().split('T')[0],
        amount: result.amount || 0,
        walletId: result.walletId || '',
        incomeCategoryId: result.incomeCategoryId || '',
        expenseCategoryId: result.expenseCategoryId || '',
        projectId: result.projectId || '',
        isCommonCost: result.isCommonCost || false,
        note: result.note || inputText,
        missingFields: result.missingFields || [],
      };

      setDraft(nextDraft);
      setShowDraftModal(true);
      setBanner({ type: 'success', message: 'Đã tạo bản nháp (Draft)' });
    } catch (error) {
      console.error('Failed to create draft:', error);
      setBanner({ type: 'error', message: 'Không thể tạo bản nháp' });
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const validateBeforeCreate = (d: DraftData): string[] => {
    const errors: string[] = [];

    if (!d.date) errors.push('Ngày');
    if (!d.amount || d.amount <= 0) errors.push('Số tiền');
    if (!d.walletId) errors.push('Ví');

    if (d.type === 'INCOME') {
      if (!d.incomeCategoryId) errors.push('Danh mục thu');
    } else {
      if (!d.expenseCategoryId) errors.push('Danh mục chi');
      if (!d.isCommonCost && !d.projectId) errors.push('Đơn hàng hoặc Chi phí chung');
    }

    return errors;
  };

  const handleCreateTransaction = async (d: DraftData) => {
    const errs = validateBeforeCreate(d);
    if (errs.length > 0) {
      showWarning('Thiếu thông tin', errs.join(', '));
      return;
    }

    try {
      // Build payload using helper for Prisma nested format
      const payload = d.type === 'INCOME'
        ? buildIncomeCreatePayload({
            type: 'INCOME',
            date: d.date,
            amount: d.amount,
            walletId: d.walletId,
            incomeCategoryId: d.incomeCategoryId || '',
            projectId: d.projectId,
            note: d.note,
            isCommonCost: false,
          })
        : buildExpenseCreatePayload({
            type: 'EXPENSE',
            date: d.date,
            amount: d.amount,
            walletId: d.walletId,
            expenseCategoryId: d.expenseCategoryId || '',
            projectId: d.projectId,
            note: d.note,
            isCommonCost: d.isCommonCost || false,
          });

      await apiClient('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowDraftModal(false);
      setDraft(null);
      setInputText('');
      setSelectedFile(null);
      setAttachmentUrl(null);

      showSuccess('Tạo phiếu thành công');
      router.push(d.type === 'INCOME' ? '/cashbook/income' : '/cashbook/expense');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      showError('Lỗi kết nối server');
    }
  };

  const handleReset = () => {
    setInputText('');
    setSelectedFile(null);
    setAttachmentUrl(null);
    setDraft(null);
    setShowDraftModal(false);
    setBanner(null);
  };

  const acceptTypes = useMemo(() => '.png,.jpg,.jpeg,.pdf', []);

  if (authLoading) {
    return (
      <div>
        <PageHeader title="AI nhập liệu" description="Đang tải..." />
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">Đang tải...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div>
      <PageHeader title="AI nhập liệu" description="Dán text / upload file -> tạo draft -> duyệt -> tạo phiếu" />

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A) Input */}
        <Card>
          <CardHeader>
            <CardTitle>Nhập liệu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Dán nội dung</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={8}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ví dụ: Chi 2 triệu vận chuyển ví tiền mặt hôm nay chi phí chung"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Upload file (png/jpg/pdf)</label>
              <Input
                type="file"
                accept={acceptTypes}
                onChange={(e) => onPickFile(e.target.files?.[0] || null)}
              />
              {selectedFile && (
                <div className="text-xs text-gray-600 mt-1">Đã chọn: {selectedFile.name}</div>
              )}
              {attachmentUrl && (
                <div className="text-xs text-gray-600 mt-1">Đã upload: {attachmentUrl}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ModeHint</label>
              <Select value={modeHint} onChange={(e) => setModeHint(e.target.value as ModeHint)}>
                <option value="auto">Auto</option>
                <option value="income">Thu</option>
                <option value="expense">Chi</option>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateDraft} disabled={isCreatingDraft}>
                {isCreatingDraft ? 'Đang tạo...' : 'Tạo bản nháp (Draft)'}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Làm lại
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* B) Draft Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Draft preview</CardTitle>
          </CardHeader>
          <CardContent>
            {!draft ? (
              <div className="text-sm text-gray-500">Chưa có draft. Hãy dán nội dung và bấm “Tạo bản nháp”.</div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm"><span className="text-gray-500">Loại:</span> <b>{draft.type === 'INCOME' ? 'Thu' : 'Chi'}</b></div>
                <div className="text-sm"><span className="text-gray-500">Ngày:</span> {draft.date}</div>
                <div className="text-sm"><span className="text-gray-500">Số tiền:</span> {draft.amount}</div>
                <div className="text-sm"><span className="text-gray-500">Ví:</span> {draft.walletId || '—'}</div>
                <div className="text-sm"><span className="text-gray-500">Danh mục:</span> {draft.type === 'INCOME' ? (draft.incomeCategoryId || '—') : (draft.expenseCategoryId || '—')}</div>
                <div className="text-sm"><span className="text-gray-500">Đơn/Chung:</span> {draft.type === 'EXPENSE' ? (draft.isCommonCost ? 'Chi phí chung' : (draft.projectId || '—')) : (draft.projectId || '—')}</div>

                {draft.missingFields?.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    Thiếu: {draft.missingFields.join(', ')}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => setShowDraftModal(true)}>Chỉnh & Tạo phiếu</Button>
                  <Button variant="outline" onClick={handleReset}>Làm lại</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showDraftModal && draft && (
        <AiDraftModal
          draft={draft}
          wallets={wallets}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          projects={projects}
          onConfirm={handleCreateTransaction}
          onClose={() => setShowDraftModal(false)}
        />
      )}
    </div>
  );
}
