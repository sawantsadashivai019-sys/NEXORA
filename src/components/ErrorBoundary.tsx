
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] text-[var(--color-text-primary)] p-4">
          <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
              We encountered an unexpected error. Please try reloading the page.
            </p>
            
            {this.state.error && (
                <div className="mb-6 p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-left overflow-hidden">
                    <p className="font-mono text-xs text-red-500 break-words">
                        {this.state.error.toString()}
                    </p>
                </div>
            )}

            <button 
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
                <RefreshCw size={18} />
                Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
