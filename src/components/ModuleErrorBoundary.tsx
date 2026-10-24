import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  label: string;
};

type State = {
  hasError: boolean;
};

export class ModuleErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      console.error(`Workspace module failed: ${this.props.label}`, error);
    }
  }

  render() {
    if (this.state.hasError) {
      return <section className="module-error" role="alert" lang="ar" dir="rtl">
        <strong>تعذر تحميل {this.props.label}</strong>
        <p>بقية مساحة العمل متاحة. أعد فتح القسم أو حدّث الصفحة للمحاولة مجدداً.</p>
      </section>;
    }
    return this.props.children;
  }
}
