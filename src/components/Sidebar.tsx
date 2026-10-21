import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { StatusBadge } from './components/StatusBadge';
import { ChatPanel } from './components/ChatPanel';
import { MetricCard } from './components/MetricCard';
import { Sidebar } from './components/Sidebar';
import type { ChatMessage, DashboardMetric } from './types';
import { appConfig } from './config/env';

const metrics: DashboardMetric[] = [
  { label: 'Active users', value: '18,420', delta: '+12.4%', tone: 'positive' },
  { label: 'Latency', value: '162ms', delta: '-22ms', tone: 'positive' },
  { label: 'API uptime', value: '99.98%', delta: '+0.4%', tone: 'positive' },
  { label: 'Error rate', value: '0.16%', delta: '-0.08%', tone: 'positive' },
];

function LoginPage() {
  const { signInWithGoogle, session, isReady, signOut } = useAuth();

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-row">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">Enterprise gateway</p>
            <h1>NEXORA Nexus Prime</h1>
          </div>
        </div>

        <div className="auth-panel">
          <div className="status-panel">
            <StatusBadge tone="positive" label="Secure routing enabled" />
            <StatusBadge tone="neutral" label={`Environment: ${appConfig.environment}`} />
          </div>

          <h2>Secure access</h2>
          <p>
            Authenticate through a protected gateway using Supabase Auth or Google OAuth. Runtime secrets remain isolated from the presentation layer.
          </p>

          <button className="primary-button" onClick={() => void signInWithGoogle()} disabled={!isReady}>
            {session ? 'Continue to dashboard' : 'Continue with Google'}
          </button>

          {session && (
            <button className="secondary-button" onClick={() => void signOut()}>
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('nexora-chat-messages');
    if (stored) {
      try {
        setChatMessages(JSON.parse(stored));
      } catch {
        localStorage.removeItem('nexora-chat-messages');
      }
    }
  }, []);

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
            <h2>NEXORA Nexus Prime</h2>
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

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return <div className="loading-shell">Finalizing secure sign-in...</div>;
}

function AppRoutes() {
  const { isReady } = useAuth();

  if (!isReady) {
    return <div className="loading-shell">Initializing secure gateway...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
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
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

