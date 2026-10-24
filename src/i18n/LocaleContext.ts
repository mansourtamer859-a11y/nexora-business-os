import { createContext } from 'react';

export type Locale = 'ar' | 'en';

export type LocaleContextValue = {
  locale: Locale;
  direction: 'rtl' | 'ltr';
  setLocale: (locale: Locale) => void;
  t: (text: string) => string;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);
