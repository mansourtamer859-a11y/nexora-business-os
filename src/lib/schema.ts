import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, fallback: string = '') => {
  const value = import.meta.env[key] ?? fallback;
  return typeof value === 'string' ? value : fallback;
};

export const appConfig = {
  appName: getEnv('VITE_APP_NAME', 'NEXORA Business OS'),
  environment: getEnv('VITE_APP_ENVIRONMENT', 'development'),
  apiBaseUrl: getEnv('VITE_API_BASE_URL', 'https://api.example.com'),
  supabaseUrl: getEnv('VITE_SUPABASE_URL', ''),
  supabaseAnonKey: getEnv('VITE_SUPABASE_ANON_KEY', ''),
  googleClientId: getEnv('VITE_GOOGLE_CLIENT_ID', ''),
  enableDemoAuth: getEnv('VITE_ENABLE_DEMO_AUTH', 'true') === 'true',
};

export const isSecureConfigReady = Boolean(
  appConfig.supabaseUrl && appConfig.supabaseAnonKey && appConfig.googleClientId,
);

export const runtimeSecurity = {
  isSecureContext: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
  environment: appConfig.environment,
  authProviders: ['Supabase Auth', 'Google OAuth'],
};
