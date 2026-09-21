import { Component, type ErrorInfo, type ReactNode } from 'react';
import Button from './Button';
import StageFrame from './StageFrame';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('App render failed:', error, errorInfo);
  }

  private retry = (): void => {
    this.props.onRetry?.();
    this.setState({ hasError: false });
  };

  private resetToLanding = (): void => {
    this.props.onReset();
    this.retry();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-cream px-6 py-10 flex items-center">
        <StageFrame className="text-center">
          <p className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">Ask Leadership</p>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-ink uppercase tracking-tight mt-4">
            We hit a snag keeping the room in sync.
          </h1>
          <p className="font-body font-semibold text-muted-ink mt-3 max-w-lg mx-auto">
            Your identity remains anonymous. Try reconnecting to the room, or return safely to the landing page.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7">
            <Button variant="primary" onClick={this.retry}>Retry</Button>
            <Button variant="ghost" onClick={this.resetToLanding}>Back to landing</Button>
          </div>
        </StageFrame>
      </main>
    );
  }
}
