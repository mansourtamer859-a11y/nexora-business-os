import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ChatPanel } from './components/ChatPanel';
import { Sidebar } from './components/Sidebar';
import { StatusBadge } from './components/StatusBadge';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { MetricCard } from './components/MetricCard';
import type { ChatMessage } from './types';

const ADMIN_PASSCODE = '#117007';
const VALID_MFA_TOKEN = '117007';

function SitePasscodeGate({ onUnlock }: { onUnlock: () => void }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (passcode.trim() === ADMIN_PASSCODE) {
      setError('');
      sessionStorage.setItem('nexus-site-pass', 'true');
      onUnlock();
      return;
    }

    setError('Access denied. The site passcode is invalid.');
  };

  return (
    <div className="secure-shell">
      <div className="secure-card glass-panel">
        <div className="brand-row ">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">Secure access</p>
            <h1>NEXUS SaaS ERP OS</h1>
          </div>
        </div>

        <div className="passcode-panel">
          <p className="passcode-label">Stage 1: Administrative site passcode</p>
          <form onSubmit={handleSubmit} className="passcode-form">
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter secure site passcode"
              aria-label="Administrative site passcode"
            />
            <button className="primary-button" type="submit">Unlock Portal</button>
          </form>

          {error && <div className="error-banner">{error}</div>}
        </div>
      </div>
    </div>
  );
}

function LoginPortal() {
  const { signInWithGoogle, session, signOut } = useAuth();
  const [email, setEmail] = useState('admin@nexusprime.io');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleCredentialLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError('');

    if (!email.trim() || !password.trim()) {
      setAuthError('Both email and password are required.');
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsSubmitting(false);
    sessionStorage.setItem('nexus-login', 'true');
    navigate('/mfa');
  };

  return (
    <div className="auth-shell">
      <div className="auth-card glass-panel">
        <div className="brand-row">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">Enterprise access</p>
            <h1>NEXUS SaaS ERP OS</h1>
          </div>
        </div>

        <div className="auth-panel">
          <div className="status-row">
            <StatusBadge label="Secure gateway" tone="positive" />
            <StatusBadge label="OAuth ready" tone="neutral" />
          </div>

          <h2>Stage 2: Sign in</h2>

          <form onSubmit={handleCredentialLogin} className="login-form">
            <label>
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
            </label>

            <label>
              <span>Password</span>
              <div className="password-row">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />
                <button type="button" className="toggle-button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <button className="primary-button full-width" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Authenticating...' : 'Sign in'}
            </button>
          </form>

          <div className="divider"><span>or continue with</span></div>

          <button
            className="google-button"
            type="button"
            onClick={async () => {
              try {
                await signInWithGoogle();
                navigate('/mfa');
              } catch {
                setAuthError('Google OAuth is unavailable. Please use email authentication.');
              }
            }}
          >
            Continue with Google
          </button>

          {session && (
            <button className="secondary-button full-width" type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          )}

          {authError && <div className="error-banner">{authError}</div>}
        </div>
      </div>
    </div>
  );
}

function MfaScreen() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!/^\d{7}$/.test(code)) {
      setError('The MFA code must be a 7-digit numeric token.');
      return;
    }

    setIsVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (code !== VALID_MFA_TOKEN) {
      setIsVerifying(false);
      setError('Verification failed. The OTP challenge did not match the secure token.');
      return;
    }

    sessionStorage.setItem('nexus-mfa', 'true');
    setIsVerifying(false);
    navigate('/dashboard');
  };

  return (
    <div className="auth-shell">
      <div className="auth-card glass-panel mfa-card">
        <div className="brand-row">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">Protected session</p>
            <h1>Multi-factor authentication</h1>
          </div>
        </div>

        <div className="auth-panel">
          <p className="mfa-copy">Stage 3: Enter the secure 7-digit verification token delivered to your administrative device.</p>
          <form onSubmit={handleVerify} className="mfa-form">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 7))}
              placeholder="117007"
              aria-label="Multi-factor authentication token"
              maxLength={7}
            />
            <button className="primary-button full-width" type="submit" disabled={isVerifying}>
              {isVerifying ? 'Verifying token...' : 'Verify Access'}
            </button>
          </form>

          {error && <div className="error-banner">{error}</div>}
        </div>
      </div>
    </div>
  );
}

const metrics = [
  { label: 'Total Active Users', value: '18,420', delta: '+12.4%', tone: 'positive' },
  { label: 'Total Stock Inventory', value: '1,486', delta: '+8.9%', tone: 'positive' },
  { label: 'Total Sales Revenue', value: '$287.4K', delta: '+17.1%', tone: 'positive' },
  { label: 'Total Net Profits', value: '$142.2K', delta: '+9.3%', tone: 'positive' },
];

const activityTicker = [
  'New warehouse sync completed',
  'GTM pipeline updated by sales ops',
  'Smart routing alert reviewed',
  'Financial reconciliation passed',
  'Security review acknowledged',
  'Fraud signal response initiated',
];

function DashboardPage() {
  const { session } = useAuth();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('nexus-chat-messages');
    if (stored) {
      try {
        setChatMessages(JSON.parse(stored));
      } catch {
        localStorage.removeItem('nexus-chat-messages');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nexus-chat-messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  const greeting = useMemo(() => {
    const email = session?.email ?? 'Administrator';
    return `Good morning, ${email}. The operational matrix is secure and ready.`;
  }, [session]);

  return (
    <div className="dashboard-shell">
      <Sidebar />

      <main className="main-panel">
        <header className="topbar glass-panel">
          <div>
            <p className="eyebrow">Executive command</p>
            <h2>NEXUS SaaS ERP OS</h2>
          </div>

          <div className="topbar-actions">
            <StatusBadge label="Live operational feed" tone="positive" />
            <div className="user-chip">
              <span className="user-avatar">A</span>
              <span>{session?.email ?? 'admin@nexusprime.io'}</span>
            </div>
          </div>
        </header>

        <section className="hero-bar glass-panel">
          <div>
            <p className="eyebrow">Realtime overview</p>
            <h3>{greeting}</h3>
          </div>
          <div className="hero-right">
            <StatusBadge label="System stable" tone="positive" />
            <span className="subtle-pill">7-day velocity tracking</span>
          </div>
        </section>

        <section className="kpi-row" aria-label="Executive KPIs">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="analytics-grid">
          <div className="glass-panel large-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Velocity</p>
                <h3>7-Day transaction flow</h3>
              </div>
              <StatusBadge label="+18.4%" tone="positive" />
            </div>

            <svg className="line-chart" viewBox="0 0 560 220" role="img" aria-label="Revenue velocity chart">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="1">
                  <stop offset="0%" stopColor="#5aa7ff" />
                  <stop offset="100%" stopColor="#7ef0d3" />
                </linearGradient>
              </defs>
              <path d="M0 160 C60 150, 90 120, 140 130 S220 90, 270 100 S350 70, 390 85 S470 35, 560 55 L560 220 L0 220 Z" fill="rgba(90,167,255,0.08)" />
              <path d="M0 160 C60 150, 90 120, 140 130 S220 90, 270 100 S350 70, 390 85 S470 35, 560 55" fill="none" stroke="url(#chartGradient)" strokeWidth="4" strokeLinecap="round" />
              {[0, 1, 2, 3, 4, 5, 6].map((index) => {
                const x = 80 + index * 70;
                const y = 140 - index * 8;
                return <circle key={index} cx={x} cy={y} r="4" fill="#8dead6" />;
              })}
            </svg>
          </div>

          <div className="glass-panel side-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Distributions</p>
                <h3>Category mix</h3>
              </div>
            </div>

            <div className="donut-stack">
              <div className="donut-chart" style={{ background: 'conic-gradient(#5aa7ff 0 40%, #7ef0d3 40% 68%, #8db6ff 68% 100%)' }}>
                <div className="donut-inner">
                  <strong>78%</strong>
                  <span>Growth</span>
                </div>
              </div>
              <ul className="legend-list">
                <li><span className="legend-swatch blue" />Operations</li>
                <li><span className="legend-swatch green" />Revenue</li>
                <li><span className="legend-swatch violet" />Supply</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="glass-panel ticker-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Stream</p>
                <h3>Chronological activity</h3>
              </div>
            </div>

            <div className="ticker-list">
              {activityTicker.map((item, index) => (
                <div className="ticker-item" key={item + index}>
                  <span className="ticker-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <ChatPanel messages={chatMessages} setMessages={setChatMessages} />
        </section>
      </main>
    </div>
  );
}

function AppRoutes() {
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('nexus-site-pass') === 'true');
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('nexus-login') === 'true');
  const [isMfaVerified, setIsMfaVerified] = useState(() => sessionStorage.getItem('nexus-mfa') === 'true');

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleMfaSuccess = () => {
    setIsMfaVerified(true);
  };

  if (!isUnlocked) {
    return <SitePasscodeGate onUnlock={handleUnlock} />;
  }

  if (!isAuthenticated) {
    return <LoginPortal />;
  }

  if (!isMfaVerified) {
    return <MfaScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
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

