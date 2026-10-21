import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';
import { appConfig } from '../config/env';
import type { AuthSession } from '../types';

const AUTH_STORAGE_KEY = 'nexora-auth-session';

type AuthContextValue = {
  session: AuthSession | null;
  isReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toAuthSession = (session: Session | null): AuthSession | null => {
  if (!session || !session.user) return null;

  return {
    id: session.user.id ?? null,
    userId: session.user.id,
    email: session.user.email,
    provider: session.user.app_metadata?.provider === 'google' ? 'google' : 'supabase',
  };
};

const supabase = appConfig.supabaseUrl && appConfig.supabaseAnonKey
  ? createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

    if (!supabase) {
      if (appConfig.enableDemoAuth) {
        setSession({
          id: 'demo-session',
          userId: 'demo-user-1',
          email: 'nexora.operator@demo.local',
          provider: 'demo',
        });
      }
      setIsReady(true);
      return;
    }

    const syncSession = async () => {
      const { data: { session: activeSession }, error } = await supabase.auth.getSession();
      if (!error) {
        const authSession = toAuthSession(activeSession);
        setSession(authSession);
      }
      setIsReady(true);
    };

    void syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(toAuthSession(activeSession));
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [session]);

  const signInWithGoogle = async () => {
    if (supabase) {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
      return;
    }

    if (appConfig.enableDemoAuth) {
      setSession({
        id: 'demo-session',
        userId: 'demo-user-1',
        email: 'nexora.operator@demo.local',
        provider: 'demo',
      });
      return;
    }

    throw new Error('Supabase is not configured and demo auth is disabled in the environment.');
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
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
