'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message, duration: 8000 });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{
      toasts,
      showToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      removeToast,
      clearAll,
    }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${bgColors[toast.type]} animate-in slide-in-from-right fade-in duration-300`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${textColors[toast.type]}`}>
          {toast.type === 'success' && '✅ '}
          {toast.type === 'error' && '❌ '}
          {toast.type === 'warning' && '⚠️ '}
          {toast.type === 'info' && 'ℹ️ '}
          {toast.title}
        </p>
        {toast.message && (
          <p className={`mt-1 text-sm ${textColors[toast.type]} opacity-80`}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
      >
        <X className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );
}

// =============================================================================
// API ERROR HELPER - Unified error handling for API responses
// =============================================================================

export interface ApiError {
  status?: number;
  statusText?: string;
  message?: string;
  data?: unknown;
}

export function parseApiError(error: unknown): { title: string; message: string } {
  // Case 1: Error object with message
  if (error instanceof Error) {
    const err = error as Error & { status?: number; statusText?: string };
    if (err.status) {
      return {
        title: `${err.status} ${err.statusText || 'Error'}`,
        message: err.message,
      };
    }
    return {
      title: 'Lỗi',
      message: err.message,
    };
  }

  // Case 2: Object with status/data
  if (error && typeof error === 'object') {
    const err = error as ApiError;
    if (err.status) {
      return {
        title: `${err.status} ${err.statusText || 'Error'}`,
        message: err.message || 'Có lỗi xảy ra',
      };
    }
    if (err.message) {
      return {
        title: 'Lỗi',
        message: err.message,
      };
    }
  }

  // Case 3: String error
  if (typeof error === 'string') {
    return {
      title: 'Lỗi',
      message: error,
    };
  }

  // Default fallback
  return {
    title: 'Lỗi hệ thống',
    message: 'Có lỗi không xác định xảy ra. Vui lòng thử lại sau.',
  };
}

// Helper to show API error with proper formatting
export function showApiError(error: unknown, showToast: (t: Omit<Toast, 'id'>) => void): void {
  const { title, message } = parseApiError(error);
  showToast({ type: 'error', title, message });
}

