import { Component, type ReactNode } from 'react';
import { LocaleContext } from '../i18n/LocaleContext';

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
      return <LocaleContext.Consumer>{(locale) => <section className="module-error" role="alert" lang={locale?.locale ?? 'ar'} dir={locale?.direction ?? 'rtl'}>
        <strong>{locale?.t('تعذر تحميل') ?? 'تعذر تحميل'} {locale?.t(this.props.label) ?? this.props.label}</strong>
        <p>{locale?.t('بقية مساحة العمل متاحة. أعد فتح القسم أو حدّث الصفحة للمحاولة مجدداً.') ?? 'بقية مساحة العمل متاحة. أعد فتح القسم أو حدّث الصفحة للمحاولة مجدداً.'}</p>
      </section>}</LocaleContext.Consumer>;
    }
    return this.props.children;
  }
}
