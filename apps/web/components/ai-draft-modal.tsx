'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Wallet, IncomeCategory, ExpenseCategory, Project } from '@tran-go-hoang-gia/shared';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { MoneyInput } from '@/components/common/money-input';
import { DateInput } from '@/components/common/date-input';

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

interface AiDraftModalProps {
  draft: DraftData;
  wallets: Wallet[];
  incomeCategories: IncomeCategory[];
  expenseCategories: ExpenseCategory[];
  projects: Project[];
  onConfirm: (draft: DraftData) => void;
  onClose: () => void;
}

export function AiDraftModal({
  draft,
  wallets,
  incomeCategories,
  expenseCategories,
  projects,
  onConfirm,
  onClose,
}: AiDraftModalProps) {
  const [localDraft, setLocalDraft] = useState<DraftData>(draft);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasMissingFields = localDraft.missingFields.length > 0 ||
    !localDraft.walletId ||
    !localDraft.amount ||
    (localDraft.type === 'INCOME' && !localDraft.incomeCategoryId) ||
    (localDraft.type === 'EXPENSE' && !localDraft.expenseCategoryId) ||
    (localDraft.type === 'EXPENSE' && !localDraft.isCommonCost && !localDraft.projectId);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      onConfirm(localDraft);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDraft = (updates: Partial<DraftData>) => {
    setLocalDraft(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            XÃ¡c nháº­n nháº­p liá»‡u tá»« giá»ng nÃ³i
          </CardTitle>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Missing fields warning */}
          {hasMissingFields && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">ThÃ´ng tin cÃ²n thiáº¿u</p>
                  <p className="text-sm text-amber-600 mt-1">
                    Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin trÆ°á»›c khi táº¡o phiáº¿u.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Original transcript */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Giá»ng nÃ³i nháº­n Ä‘Æ°á»£c:</p>
            <p className="text-sm italic text-gray-700">&quot;{draft.note}&quot;</p>
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">NgÃ y *</label>
                <DateInput
                  value={localDraft.date}
                  onChange={(e) => updateDraft({ date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sá»‘ tiá»n (VND) *</label>
                <MoneyInput
                  value={localDraft.amount || 0}
                  onChange={(val) => updateDraft({ amount: val })}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">VÃ­ *</label>
              <Select
                value={localDraft.walletId || ''}
                onChange={(e) => updateDraft({ walletId: e.target.value })}
                className="w-full"
              >
                <option value="">Chá»n vÃ­...</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </div>

            {localDraft.type === 'INCOME' && (
              <div>
                <label className="block text-sm font-medium mb-1">Danh má»¥c thu *</label>
                <Select
                  value={localDraft.incomeCategoryId || ''}
                  onChange={(e) => updateDraft({ incomeCategoryId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Chá»n danh má»¥c...</option>
                  {incomeCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            )}

            {localDraft.type === 'EXPENSE' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Danh má»¥c chi *</label>
                  <Select
                    value={localDraft.expenseCategoryId || ''}
                    onChange={(e) => updateDraft({ expenseCategoryId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Chá»n danh má»¥c...</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Loáº¡i chi *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!localDraft.isCommonCost}
                        onChange={() => updateDraft({ isCommonCost: false, projectId: '' })}
                        className="rounded"
                      />
                      <span>Chi theo Ä‘Æ¡n</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={localDraft.isCommonCost}
                        onChange={() => updateDraft({ isCommonCost: true, projectId: '' })}
                        className="rounded"
                      />
                      <span>Chi phÃ­ chung</span>
                    </label>
                  </div>
                </div>

                {!localDraft.isCommonCost && (
                  <div>
                    <label className="block text-sm font-medium mb-1">ÄÆ¡n hÃ ng</label>
                    <Select
                      value={localDraft.projectId || ''}
                      onChange={(e) => updateDraft({ projectId: e.target.value })}
                      className="w-full"
                    >
                      <option value="">Chá»n Ä‘Æ¡n hÃ ng...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Ghi chÃº</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
                value={localDraft.note}
                onChange={(e) => updateDraft({ note: e.target.value })}
                placeholder="Ghi chÃº..."
              />
            </div>
          </div>

          {/* Preview amount */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm text-green-600">Sá»‘ tiá»n dá»± kiáº¿n</p>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(localDraft.amount || 0)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Há»§y
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={hasMissingFields || isSubmitting}
              className={hasMissingFields ? 'opacity-50' : ''}
            >
              {isSubmitting ? 'Äang táº¡o...' : 'Táº¡o phiáº¿u'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


