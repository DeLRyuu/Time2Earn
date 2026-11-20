import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Time2Earn caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Card
            variant="neon"
            header={<span>SYSTEM ANOMALY DETECTED</span>}
            footer={
              <Button variant="arcade" onClick={this.handleReset}>
                REBOOT CONSOLE
              </Button>
            }
          >
            <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontWeight: 600 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              The Time2Earn engine safely contained this fault. Click reboot to refresh the application.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
