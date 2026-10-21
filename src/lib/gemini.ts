import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { appConfig, isSecureConfigReady } from '../config/env';
import type { AuthSession } from '../types';

const AUTH_STORAGE_KEY = 'nexora-auth-session';

type AuthContextValue = {
  session: AuthSession | null;
  isReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedValue = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedValue) {
      try {
        setSession(JSON.parse(storedValue));
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [session]);

  const signInWithGoogle = async () => {
    if (!isSecureConfigReady && !appConfig.enableDemoAuth) {
      throw new Error('Google OAuth is not configured. Supply VITE_GOOGLE_CLIENT_ID and VITE_SUPABASE_* values.');
    }

    const demoSession: AuthSession = {
      userId: 'demo-user-1',
      email: 'nexora.operator@demo.local',
      provider: 'google',
    };

    setSession(demoSession);
  };

  const signOut = async () => {
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ session, isReady, signInWithGoogle, signOut }),
    [session, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
