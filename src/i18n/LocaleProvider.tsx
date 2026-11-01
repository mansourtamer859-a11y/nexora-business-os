import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LocaleContext, type Locale, type LocaleContextValue } from './LocaleContext';
import arMessages from './translations/ar.json';
import enMessages from './translations/en.json';

const ar: Record<string, string> = arMessages;
const en: Record<string, string> = enMessages;

const STORAGE_KEY = 'nexus-locale-v1';
const arabicToEnglish = new Map<string, string>(
  Object.entries(ar).map(([english, arabic]) => [arabic, english]),
);

function getInitialLocale(): Locale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Keep the language switch usable when browser persistence is unavailable.
    }
  }, [direction, locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    direction,
    setLocale,
    t: (text) => locale === 'ar' ? ar[text] ?? text : en[text] ?? arabicToEnglish.get(text) ?? text,
  }), [direction, locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
