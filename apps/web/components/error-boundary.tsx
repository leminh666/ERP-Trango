'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    this.setState({
      error,
      errorInfo: errorInfo.componentStack || null,
    });
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Đã xảy ra lỗi
              </h1>
              <p className="text-gray-600 mb-4">
                Rất tiếc, đã có lỗi không mong muốn xảy ra. Vui lòng thử lại.
              </p>
              {this.state.error && (
                <p className="text-sm text-gray-500 mb-4 font-mono bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleReload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tải lại trang
              </Button>
              <Button variant="default" onClick={this.handleGoHome}>
                <Home className="mr-2 h-4 w-4" />
                Về trang chủ
              </Button>
            </div>

            <p className="mt-6 text-xs text-gray-400">
              Nếu lỗi tiếp tục xảy ra, vui lòng liên hệ hỗ trợ kỹ thuật.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

