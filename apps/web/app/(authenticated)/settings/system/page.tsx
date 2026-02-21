'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { Loader2, Mic, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { VoiceTestModal } from './voice-test-modal';
import { useToast } from '@/components/toast-provider';

interface AiConfig {
  enabled: boolean;
  provider: 'mock' | 'openai';
  model: string;
  apiKey?: string;
  defaultWalletId?: string;
  defaultIncomeCategoryId?: string;
  defaultExpenseCategoryId?: string;
}

interface ReminderConfig {
  enabled: boolean;
  timeWindows: string[];
  daysOfWeek: number[];
  graceMinutes: number;
  scopes: { cashbook: boolean; orders: boolean };
}

interface VoiceConfig {
  enabled: boolean;
  provider: 'browser';
  language: string;
  autoPunctuation: boolean;
  interimResults: boolean;
  maxSecondsPerSegment: number;
  pushToTalk: boolean;
}

interface AuthConfig {
  rememberEmailDefault: boolean;
  session: { enabled: boolean; idleTimeoutMinutes: number; absoluteTimeoutMinutes: number; };
  passwordReset: { enabled: boolean; tokenExpireMinutes: number; smtp: { enabled: boolean; host?: string; port?: number; user?: string; pass?: string; from?: string; }; };
  googleOAuth: { enabled: boolean; clientId?: string; clientSecret?: string; callbackUrl?: string; };
}

interface SystemSettings {
  ai: AiConfig;
  reminders: ReminderConfig;
  voice: VoiceConfig;
  auth: AuthConfig;
}

interface Wallet {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 7, label: 'CN' },
];

const LANGUAGES = [
  { value: 'vi-VN', label: 'Tiếng Việt' },
  { value: 'en-US', label: 'English (US)' },
];

export default function SystemSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError }= useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'ai' | 'reminders' | 'voice' | 'auth' | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    ai: { enabled: false, provider: 'mock', model: '', apiKey: '' },
    reminders: { enabled: false, timeWindows: [], daysOfWeek: [], graceMinutes: 0, scopes: { cashbook: false, orders: false } },
    voice: { enabled: false, provider: 'browser', language: 'vi-VN', autoPunctuation: true, interimResults: true, maxSecondsPerSegment: 30, pushToTalk: true },
    auth: { 
      rememberEmailDefault: true,
      session: { enabled: true, idleTimeoutMinutes: 30, absoluteTimeoutMinutes: 720 },
      passwordReset: { enabled: true, tokenExpireMinutes: 30, smtp: { enabled: false } },
      googleOAuth: { enabled: false },
    },
  });
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [newTimeWindow, setNewTimeWindow] = useState('');

  // Check admin access
  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/403');
    }
  }, [user, authLoading, router]);

  // Load settings
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchSettings();
      fetchDropdowns();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const data = await apiClient<SystemSettings>('/settings');
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [walletsData, incomeData, expenseData] = await Promise.all([
        apiClient<Wallet[]>('/wallets'),
        apiClient<Category[]>('/income-categories'),
        apiClient<Category[]>('/expense-categories'),
      ]);

      setWallets(walletsData);
      setIncomeCategories(incomeData);
      setExpenseCategories(expenseData);
    } catch (error) {
      console.error('Failed to fetch dropdowns:', error);
    }
  };

  const saveSettings = async (section: 'ai' | 'reminders' | 'voice' | 'auth') => {
    if (!settings) return;

    setSaving(section);
    try {
      const payload: Partial<SystemSettings> = {};
      if (section === 'ai') payload.ai = settings.ai;
      if (section === 'reminders') payload.reminders = settings.reminders;
      if (section === 'voice') payload.voice = settings.voice;
      if (section === 'auth') payload.auth = settings.auth;

      await apiClient('/settings', {
        method: 'PUT',
        body: payload,
      });

      await fetchSettings();
      showSuccess('Lưu thành công');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      showError('Lỗi khi lưu cấu hình', error?.message || 'Vui lòng thử lại');
    } finally {
      setSaving(null);
    }
  };

  // AI Settings handlers
  const updateAiSetting = <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => {
    setSettings(prev => ({ ...prev, ai: { ...prev.ai, [key]: value } }));
  };

  // Reminder Settings handlers
  const updateReminderSetting = <K extends keyof ReminderConfig>(key: K, value: ReminderConfig[K]) => {
    setSettings(prev => ({ ...prev, reminders: { ...prev.reminders, [key]: value } }));
  };

  const toggleDayOfWeek = (day: number) => {
    setSettings(prev => {
      const days = prev.reminders.daysOfWeek.includes(day)
        ? prev.reminders.daysOfWeek.filter(d => d !== day)
        : [...prev.reminders.daysOfWeek, day].sort();
      return { ...prev, reminders: { ...prev.reminders, daysOfWeek: days } };
    });
  };

  const addTimeWindow = () => {
    if (newTimeWindow && !settings.reminders.timeWindows.includes(newTimeWindow)) {
      setSettings(prev => ({
        ...prev,
        reminders: {
          ...prev.reminders,
          timeWindows: [...prev.reminders.timeWindows, newTimeWindow].sort()
        }
      }));
      setNewTimeWindow('');
    }
  };

  const removeTimeWindow = (time: string) => {
    setSettings(prev => ({
      ...prev,
      reminders: {
        ...prev.reminders,
        timeWindows: prev.reminders.timeWindows.filter(t => t !== time)
      }
    }));
  };

  // Voice Settings handlers
  const updateVoiceSetting = <K extends keyof VoiceConfig>(key: K, value: VoiceConfig[K]) => {
    setSettings(prev => ({ ...prev, voice: { ...prev.voice, [key]: value } }));
  };

  // Auth Settings handlers
  const updateAuthSetting = <K extends keyof AuthConfig>(key: K, value: AuthConfig[K]) => {
    setSettings(prev => ({ ...prev, auth: { ...prev.auth, [key]: value } }));
  };

  const updateSessionSetting = (key: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      auth: {
        ...prev.auth,
        session: { ...prev.auth.session, [key]: value }
      }
    }));
  };

  const updatePasswordResetSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      auth: {
        ...prev.auth,
        passwordReset: { ...prev.auth.passwordReset, [key]: value }
      }
    }));
  };

  const updateGoogleOAuthSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      auth: {
        ...prev.auth,
        googleOAuth: { ...prev.auth.googleOAuth, [key]: value }
      }
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Cài đặt hệ thống"
        description="Cấu hình AI, nhắc nhập liệu, giọng nói và đăng nhập"
      />

      <div className="grid gap-6">
        {/* Auth Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">🔐</span>
              Đăng nhập & Bảo mật
            </CardTitle>
            <CardDescription>
              Cấu hình xác thực, quên mật khẩu và Google OAuth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Session Settings */}
            <div>
              <Label className="text-base font-medium">Phiên đăng nhập</Label>
              <div className="grid gap-4 md:grid-cols-3 mt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Bật quản lý phiên</Label>
                  <Switch
                    checked={settings?.auth.session?.enabled ?? true}
                    onCheckedChange={(checked) => updateSessionSetting('enabled', Number(checked))}
                  />
                </div>
                <div>
                  <Label>Timeout không hoạt động (phút)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={settings?.auth.session?.idleTimeoutMinutes || 30}
                    onChange={(e) => updateSessionSetting('idleTimeoutMinutes', parseInt(e.target.value) || 30)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label>Timeout tuyệt đối (phút)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10080}
                    value={settings?.auth.session?.absoluteTimeoutMinutes || 720}
                    onChange={(e) => updateSessionSetting('absoluteTimeoutMinutes', parseInt(e.target.value) || 720)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <hr />

            {/* Password Reset Settings */}
            <div>
              <Label className="text-base font-medium">Quên mật khẩu</Label>
              <div className="grid gap-4 md:grid-cols-2 mt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Bật chức năng quên mật khẩu</Label>
                  <Switch
                    checked={settings?.auth.passwordReset?.enabled ?? true}
                    onCheckedChange={(checked) => updatePasswordResetSetting('enabled', checked)}
                  />
                </div>
                <div>
                  <Label>Thời hạn token (phút)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={settings?.auth.passwordReset?.tokenExpireMinutes || 30}
                    onChange={(e) => updatePasswordResetSetting('tokenExpireMinutes', parseInt(e.target.value) || 30)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  <strong>Lưu ý:</strong> Khi SMTP tắt, link reset sẽ được hiển thị trong console server.
                </p>
              </div>
            </div>

            <hr />

            {/* Google OAuth Settings */}
            <div>
              <Label className="text-base font-medium">Đăng nhập Google (OAuth 2.0)</Label>
              <div className="grid gap-4 md:grid-cols-2 mt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Bật đăng nhập Google</Label>
                  <Switch
                    checked={settings?.auth.googleOAuth?.enabled ?? false}
                    onCheckedChange={(checked) => updateGoogleOAuthSetting('enabled', checked)}
                  />
                </div>
                <div>
                  <Label>Client ID</Label>
                  <Input
                    value={settings?.auth.googleOAuth?.clientId || ''}
                    onChange={(e) => updateGoogleOAuthSetting('clientId', e.target.value)}
                    placeholder="xxxxx.apps.googleusercontent.com"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 mt-2">
                <div>
                  <Label>Client Secret</Label>
                  <Input
                    type="password"
                    value={settings?.auth.googleOAuth?.clientSecret || ''}
                    onChange={(e) => updateGoogleOAuthSetting('clientSecret', e.target.value)}
                    placeholder="GOCSPX-..."
                    className="w-full"
                  />
                </div>
                <div>
                  <Label>Callback URL</Label>
                  <Input
                    value={settings?.auth.googleOAuth?.callbackUrl || ''}
                    onChange={(e) => updateGoogleOAuthSetting('callbackUrl', e.target.value)}
                    placeholder="http://localhost:4000/auth/google/callback"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Hướng dẫn:</strong> Tạo OAuth Client ID tại{' '}
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="underline">
                    Google Cloud Console
                  </a>
                  . Thêm authorized redirect URI: <code>{window.location.origin}/api/auth/google/callback</code>
                </p>
              </div>
            </div>

            <Button
              onClick={() => saveSettings('auth')}
              disabled={saving === 'auth'}
              className="w-full md:w-auto"
            >
              {saving === 'auth' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Lưu cấu hình đăng nhập
            </Button>
          </CardContent>
        </Card>

        {/* A) AI Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm">AI</span>
              Cài đặt AI nhập liệu
            </CardTitle>
            <CardDescription>
              Cấu hình AI để hỗ trợ nhập liệu tự động (text/file)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Bật AI nhập liệu</Label>
              <Switch
                checked={settings?.ai.enabled || false}
                onCheckedChange={(checked) => updateAiSetting('enabled', checked)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Provider</Label>
                <Select
                  value={settings?.ai.provider}
                  onChange={(e) => updateAiSetting('provider', e.target.value as 'mock' | 'openai')}
                  className="w-full"
                >
                  <option value="mock">Mock (Demo)</option>
                  <option value="openai">OpenAI</option>
                </Select>
              </div>

              <div>
                <Label>Model</Label>
                <Input
                  value={settings?.ai.model || ''}
                  onChange={(e) => updateAiSetting('model', e.target.value)}
                  placeholder="gpt-4"
                />
              </div>
            </div>

            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={settings?.ai.apiKey || ''}
                onChange={(e) => updateAiSetting('apiKey', e.target.value)}
                placeholder="sk-..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Ví mặc định</Label>
                <Select
                  value={settings?.ai.defaultWalletId || ''}
                  onChange={(e) => updateAiSetting('defaultWalletId', e.target.value || undefined)}
                  className="w-full"
                >
                  <option value="">Chọn ví</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Danh mục thu mặc định</Label>
                <Select
                  value={settings?.ai.defaultIncomeCategoryId || ''}
                  onChange={(e) => updateAiSetting('defaultIncomeCategoryId', e.target.value || undefined)}
                  className="w-full"
                >
                  <option value="">Chọn danh mục</option>
                  {incomeCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Danh mục chi mặc định</Label>
                <Select
                  value={settings?.ai.defaultExpenseCategoryId || ''}
                  onChange={(e) => updateAiSetting('defaultExpenseCategoryId', e.target.value || undefined)}
                  className="w-full"
                >
                  <option value="">Chọn danh mục</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <Button
              onClick={() => saveSettings('ai')}
              disabled={saving === 'ai'}
              className="w-full md:w-auto"
            >
              {saving === 'ai' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Lưu AI Settings
            </Button>
          </CardContent>
        </Card>

        {/* B) Reminder Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm">🔔</span>
              Cài đặt nhắc nhập liệu
            </CardTitle>
            <CardDescription>
              Nhắc nhập liệu theo khung giờ cố định
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Bật nhắc nhập liệu</Label>
              <Switch
                checked={settings?.reminders.enabled || false}
                onCheckedChange={(checked) => updateReminderSetting('enabled', checked)}
              />
            </div>

            <div>
              <Label>Ngày trong tuần</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DAYS_OF_WEEK.map(day => (
                  <Button
                    key={day.value}
                    variant={settings?.reminders.daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDayOfWeek(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Khung giờ nhắc</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="time"
                  value={newTimeWindow}
                  onChange={(e) => setNewTimeWindow(e.target.value)}
                  className="w-40"
                />
                <Button variant="outline" onClick={addTimeWindow}>Thêm</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {settings?.reminders.timeWindows.map(time => (
                  <span
                    key={time}
                    className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2"
                  >
                    {time}
                    <button
                      onClick={() => removeTimeWindow(time)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label>Thời gian ân hạn (phút)</Label>
              <Input
                type="number"
                min={0}
                value={settings?.reminders.graceMinutes || 0}
                onChange={(e) => updateReminderSetting('graceMinutes', parseInt(e.target.value) || 0)}
                className="w-40"
              />
              <p className="text-sm text-gray-500 mt-1">
                Số phút chậm trễ trước khi cảnh báo
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between">
                <Label>Nhắc sổ quỹ</Label>
                <Switch
                  checked={settings?.reminders.scopes.cashbook || false}
                  onCheckedChange={(checked) => updateReminderSetting('scopes', { ...settings!.reminders.scopes, cashbook: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Nhắc đơn hàng</Label>
                <Switch
                  checked={settings?.reminders.scopes.orders || false}
                  onCheckedChange={(checked) => updateReminderSetting('scopes', { ...settings!.reminders.scopes, orders: checked })}
                />
              </div>
            </div>

            <Button
              onClick={() => saveSettings('reminders')}
              disabled={saving === 'reminders'}
              className="w-full md:w-auto"
            >
              {saving === 'reminders' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Lưu Reminder Settings
            </Button>
          </CardContent>
        </Card>

        {/* C) Voice Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-600" />
              Cài đặt nhập liệu bằng giọng nói
            </CardTitle>
            <CardDescription>
              Cấu hình Web Speech API để nhập liệu bằng giọng nói
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Bật nhập liệu bằng giọng nói</Label>
              <Switch
                checked={settings?.voice.enabled || false}
                onCheckedChange={(checked) => updateVoiceSetting('enabled', checked)}
              />
            </div>

            <div>
              <Label>Ngôn ngữ</Label>
              <Select
                value={settings?.voice.language || 'vi-VN'}
                onChange={(e) => updateVoiceSetting('language', e.target.value)}
                className="w-full"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between">
                <Label>Hiển thị tạm thời (interim)</Label>
                <Switch
                  checked={settings?.voice.interimResults || false}
                  onCheckedChange={(checked) => updateVoiceSetting('interimResults', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Tự động dấu câu</Label>
                <Switch
                  checked={settings?.voice.autoPunctuation || false}
                  onCheckedChange={(checked) => updateVoiceSetting('autoPunctuation', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Push-to-talk</Label>
                <Switch
                  checked={settings?.voice.pushToTalk || false}
                  onCheckedChange={(checked) => updateVoiceSetting('pushToTalk', checked)}
                />
              </div>
            </div>

            <div>
              <Label>Thời gian tối đa mỗi đoạn (giây)</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={settings?.voice.maxSecondsPerSegment || 30}
                onChange={(e) => updateVoiceSetting('maxSecondsPerSegment', parseInt(e.target.value) || 30)}
                className="w-40"
              />
              <p className="text-sm text-gray-500 mt-1">
                Phạm vi: 5 - 120 giây
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => saveSettings('voice')}
                disabled={saving === 'voice'}
              >
                {saving === 'voice' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Lưu Voice Settings
              </Button>

              <Button variant="outline" onClick={() => setShowVoiceModal(true)}>
                <Mic className="mr-2 h-4 w-4" />
                Test Microphone
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Lưu ý về Voice Input:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Sử dụng Web Speech API (client-side)</li>
                    <li>Trình duyệt khuyến nghị: Chrome hoặc Edge</li>
                    <li>Không gửi audio lên server trong Phase 11</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voice Test Modal */}
      <VoiceTestModal
        open={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        config={settings?.voice}
      />
    </div>
  );
}
