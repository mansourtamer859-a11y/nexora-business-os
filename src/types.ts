import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { StatusBadge } from './components/StatusBadge';
import { ChatPanel } from './components/ChatPanel';
import { MetricCard } from './components/MetricCard';
import { Sidebar } from './components/Sidebar';
import type { ChatMessage, DashboardMetric } from './types';
import { appConfig } from './config/env';
import { useEffect, useMemo, useState } from 'react';

const metrics: DashboardMetric[] = [
  { label: 'Active users', value: '18,420', delta: '+12.4%', tone: 'positive' },
  { label: 'Latency', value: '162ms', delta: '-22ms', tone: 'positive' },
  { label: 'API uptime', value: '99.98%', delta: '+0.4%', tone: 'positive' },
  { label: 'Error rate', value: '0.16%', delta: '-0.08%', tone: 'positive' },
];

const defaultMessages: ChatMessage[] = [
  { id: 'welcome', role: 'assistant', content: 'Welcome back. I can help monitor the operating health of NEXORA Business OS and summarize active workflows.', createdAt: new Date().toISOString() },
  { id: 'guide', role: 'user', content: 'Show me the current operational snapshot for today.', createdAt: new Date().toISOString() },
  { id: 'guide-2', role: 'assistant', content: 'The platform is healthy. User engagement is trending upward, API latency is within target, and no critical workflows are blocked.', createdAt: new Date().toISOString() },
];

function LoginPage() {
  const { signInWithGoogle, signOut, session, isReady } = useAuth();

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-row">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">Enterprise gateway</p>
            <h1>NEXORA Business OS</h1>
          </div>
        </div>

        <div className="auth-panel">
          <div className="status-panel">
            <StatusBadge tone="positive" label="Secure routing enabled" />
            <StatusBadge tone="neutral" label={`Environment: ${appConfig.environment}`} />
          </div>

          <h2>Secure access</h2>
          <p>
            Authenticate through a protected Gateway using Supabase Auth or Google OAuth. This configuration isolates runtime secrets from the presentation layer.
          </p>

          <button className="primary-button" onClick={() => signInWithGoogle()} disabled={!isReady}>
            {session ? 'Continue to dashboard' : 'Continue with Google'}
          </button>

          {session && (
            <button className="secondary-button" onClick={() => signOut()}>
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { session } = useAuth();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const raw = localStorage.getItem('nexora-chat-messages');
    return raw ? JSON.parse(raw) : defaultMessages;
  });

  useEffect(() => {
    localStorage.setItem('nexora-chat-messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  const activityFeed = useMemo(
    () => [
      { label: 'Operations', value: 'System sync complete', time: '2 min ago' },
      { label: 'User flow', value: '8 new enterprise accounts created', time: '12 min ago' },
      { label: 'AI agent', value: 'Automated summarization completed', time: '31 min ago' },
      { label: 'Security', value: 'OAuth token refresh validated', time: '45 min ago' },
    ],
    [],
  );

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Live operations</p>
            <h2>Executive dashboard</h2>
          </div>

          <div className="topbar-meta">
            <StatusBadge tone="positive" label="Gateway healthy" />
            <div className="user-chip">
              <span className="user-avatar">{(session?.email ?? 'N').slice(0, 1).toUpperCase()}</span>
              <span>{session?.email ?? 'nexora@local'}</span>
            </div>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Business metrics">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="content-grid">
          <div className="panel panel-large">
            <div className="panel-header">
              <div>
                <p className="eyebrow">System overview</p>
                <h3>Operational health</h3>
              </div>
              <StatusBadge tone="positive" label="99.98% stable" />
            </div>

            <div className="chart-bars" aria-label="System health chart">
              {[48, 65, 58, 80, 72, 88, 95].map((value, index) => (
                <div key={index} className="bar-column">
                  <span style={{ height: `${value}%` }} />
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Security</p>
                <h3>Gateway posture</h3>
              </div>
            </div>

            <ul className="security-list">
              <li>
                <span>Auth provider</span>
                <strong>Supabase Auth</strong>
              </li>
              <li>
                <span>OAuth</span>
                <strong>Google Ready</strong>
              </li>
              <li>
                <span>Transport</span>
                <strong>HTTPS enforced</strong>
              </li>
              <li>
                <span>Secrets</span>
                <strong>Runtime only</strong>
              </li>
            </ul>
          </div>
        </section>

        <section className="content-grid bottom-grid">
          <div className="panel panel-large">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Activity stream</p>
                <h3>Real-time user activity</h3>
              </div>
            </div>

            <ul className="activity-list">
              {activityFeed.map((item) => (
                <li key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.value}</p>
                  </div>
                  <span>{item.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <ChatPanel messages={chatMessages} setMessages={setChatMessages} />
        </section>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { isReady } = useAuth();

  if (!isReady) {
    return <div className="loading-shell">Initializing secure gateway...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <useAuth.Provider>
          <AppRoutes />
        </useAuth.Provider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
