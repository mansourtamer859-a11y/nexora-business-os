export type AuthSession = {
  userId: string;
  email: string;
  provider: 'google' | 'supabase' | 'demo';
};

export type DashboardMetric = {
  label: string;
  value: string;
  delta: string;
  tone: 'positive' | 'neutral' | 'warning';
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type SafetyState = {
  isSecureContext: boolean;
  environment: string;
  authProviders: string[];
};

