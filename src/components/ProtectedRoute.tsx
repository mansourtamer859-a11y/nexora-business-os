import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured UI error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-shell">
          <div className="error-card">
            <p className="eyebrow">Gateway error</p>
            <h2>Something interrupted the session.</h2>
            <p>The application encountered a rendering error and recovered to a safe fallback state.</p>
            <button className="primary-button" onClick={() => window.location.reload()}>
              Refresh dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
