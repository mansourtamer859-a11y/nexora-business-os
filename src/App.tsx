import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { IntegrationHub } from './components/IntegrationHub';
import { ForecastPanel } from './components/ForecastPanel';
import { InvoiceArchiver } from './components/InvoiceArchiver';
import { ModuleErrorBoundary } from './components/ModuleErrorBoundary';
import { useAntiHallucination, resolveTrustedAssistantRequest } from './hooks/useAntiHallucination';
import { forgetDemoSession, readDemoSession, rememberDemoSession, DEMO_DEVICE_STORAGE_KEY, DEMO_SESSION_STORAGE_KEY, type DemoSession, type DemoSessionRead } from './lib/demoSession';
import { createGateAttemptGuard, isValidDemoAccessToken, isValidDemoPassword, normalizeDemoEmail, sanitizePlainText } from './utils/securitySandbox';

type PageId = 'Overview' | 'AI assistant' | 'Finance' | 'Sales & CRM' | 'People' | 'Inventory' | 'Analytics' | 'Integrations';
type IconName = 'grid' | 'spark' | 'wallet' | 'users' | 'briefcase' | 'boxes' | 'chart' | 'search' | 'bell' | 'chevron' | 'arrow' | 'mic' | 'play' | 'clock' | 'check' | 'plus' | 'more' | 'sun' | 'moon' | 'command' | 'trend' | 'close' | 'share';
type Stage = 'Qualified' | 'Proposal' | 'Negotiation' | 'Won';
type Deal = { id: number; company: string; contact: string; value: number; stage: Stage; color: string };
type Workflow = { id: number; title: string; state: 'running' | 'complete'; time: string };
type AccessStage = 'perimeter' | 'login' | 'workspace';

const arabicNavigation: Record<PageId, string> = {
  Overview: 'نظرة عامة',
  'AI assistant': 'مساعد Nexus',
  Finance: 'الإدارة المالية',
  'Sales & CRM': 'إدارة المتجر',
  People: 'الموارد البشرية',
  Inventory: 'إدارة المخزون',
  Analytics: 'أحدث الأنشطة',
  Integrations: 'القنوات الذكية',
};

const navigation: { id: PageId; icon: IconName; group: string }[] = [
  { id: 'Overview', icon: 'grid', group: 'WORKSPACE' },
  { id: 'AI assistant', icon: 'spark', group: 'WORKSPACE' },
  { id: 'Finance', icon: 'wallet', group: 'BUSINESS' },
  { id: 'Sales & CRM', icon: 'users', group: 'BUSINESS' },
  { id: 'People', icon: 'briefcase', group: 'BUSINESS' },
  { id: 'Inventory', icon: 'boxes', group: 'BUSINESS' },
  { id: 'Analytics', icon: 'chart', group: 'INSIGHTS' },
  { id: 'Integrations', icon: 'share', group: 'INSIGHTS' },
];

const iconContent: Record<IconName, ReactNode> = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  spark: <><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 9h18" /><path d="M16 14h2" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  boxes: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 3 6-7" /><path d="M17 6h4v4" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
  arrow: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" /></>,
  play: <path d="m8 5 12 7-12 7V5Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  moon: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />,
  command: <><path d="M9 7V5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v14a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2V7Z" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4" /></>,
};

function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{iconContent[name]}</svg>;
}

const prompts = [
  'Generate quarter sales report',
  'Audit payroll operations',
  'Show low-stock inventory',
  'Summarize this week’s cash flow',
];

const assistantPrompts: Record<PageId, { label: string; action: string }[]> = {
  Overview: [
    { label: 'عرض الملخص المالي', action: prompts[3] },
    { label: 'مراجعة الموظفين', action: prompts[1] },
  ],
  'AI assistant': [
    { label: 'عرض الملخص المالي', action: prompts[3] },
    { label: 'مراجعة الموظفين', action: prompts[1] },
    { label: 'إنشاء تقرير المبيعات', action: prompts[0] },
  ],
  Finance: [
    { label: 'تلخيص التدفق النقدي', action: prompts[3] },
    { label: 'إنشاء تقرير المبيعات', action: prompts[0] },
  ],
  'Sales & CRM': [
    { label: 'إنشاء تقرير المبيعات', action: prompts[0] },
    { label: 'عرض الملخص المالي', action: prompts[3] },
  ],
  People: [
    { label: 'مراجعة عمليات الرواتب', action: prompts[1] },
    { label: 'عرض الملخص المالي', action: prompts[3] },
  ],
  Inventory: [
    { label: 'مراجعة المخزون المنخفض', action: prompts[2] },
    { label: 'تلخيص التدفق النقدي', action: prompts[3] },
  ],
  Analytics: [
    { label: 'عرض الملخص المالي', action: prompts[3] },
    { label: 'إنشاء تقرير المبيعات', action: prompts[0] },
  ],
  Integrations: [
    { label: 'مراجعة العملاء المحتملين', action: 'Review synced leads' },
    { label: 'إنشاء تقرير المبيعات', action: prompts[0] },
  ],
};

const initialDeals: Deal[] = [
  { id: 1, company: 'Linear Labs', contact: 'Maya Chen', value: 24800, stage: 'Qualified', color: 'lilac' },
  { id: 2, company: 'Northstar Health', contact: 'James Wilson', value: 18600, stage: 'Qualified', color: 'blue' },
  { id: 3, company: 'Meridian Studio', contact: 'Sofia Patel', value: 34200, stage: 'Proposal', color: 'orange' },
  { id: 4, company: 'Atlas Commerce', contact: 'Oliver Kim', value: 12500, stage: 'Proposal', color: 'green' },
  { id: 5, company: 'Solstice Group', contact: 'Eva Laurent', value: 41600, stage: 'Negotiation', color: 'pink' },
  { id: 6, company: 'Form & Field', contact: 'Leo Martin', value: 22000, stage: 'Negotiation', color: 'yellow' },
  { id: 7, company: 'Verde Systems', contact: 'Noah Brooks', value: 31200, stage: 'Won', color: 'green' },
];

function PageHeading({ page, description, action }: { page: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{page === 'Overview' ? 'NEXUS BUSINESS ERP SAAS OS · MONDAY, OCTOBER 23, 2026' : 'NEXUS BUSINESS ERP SAAS OS'}</p><h1>{page === 'Overview' ? 'صباح الخير، Alex' : page}</h1><p className="heading-description">{description}</p></div>{action}</div>;
}

function Metric({ label, value, delta, icon, tone = 'mint' }: { label: string; value: string; delta: string; icon: IconName; tone?: string }) {
  const [points, setPoints] = useState(() => Array.from({ length: 12 }, (_, index) => 34 + ((index * 17 + label.length * 11) % 52)));
  const line = points.map((point, index) => `${index * 10},${70 - point}`).join(' ');
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPoints((current) => [...current.slice(1), Math.max(24, Math.min(86, current[current.length - 1] + Math.round(Math.random() * 18 - 8)))]);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon name={icon} size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-sparkline" aria-hidden="true"><svg viewBox="0 0 110 70" preserveAspectRatio="none"><polyline points={line} /></svg></div><div className="metric-foot"><span className="trend"><Icon name="trend" size={13} />{delta}</span><span>vs last month</span></div></article>;
}

function PerimeterGate({ onUnlock, notice }: { onUnlock: () => void; notice: string }) {
  const [token, setToken] = useState('');
  const [state, setState] = useState<'idle' | 'denied' | 'verified'>('idle');
  const [busy, setBusy] = useState(false);
  const [guard] = useState(() => createGateAttemptGuard());
  const [freezeUntil, setFreezeUntil] = useState(0);
  const [remainingFreeze, setRemainingFreeze] = useState(0);
  const attemptTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (attemptTimer.current !== null) window.clearTimeout(attemptTimer.current);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  useEffect(() => {
    if (state !== 'verified') return undefined;
    const timer = window.setTimeout(onUnlock, 620);
    return () => window.clearTimeout(timer);
  }, [state, onUnlock]);

  useEffect(() => {
    if (!freezeUntil) return undefined;
    const updateRemaining = () => {
      const remaining = Math.max(0, freezeUntil - Date.now());
      setRemainingFreeze(remaining);
      if (remaining === 0) {
        guard.reset();
        setFreezeUntil(0);
        setState('idle');
      }
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [freezeUntil, guard]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || freezeUntil > Date.now()) return;
    setBusy(true);
    attemptTimer.current = window.setTimeout(() => {
      setBusy(false);
      if (isValidDemoAccessToken(token)) setState('verified');
      else {
        setState('denied');
        const result = guard.recordFailure();
        if (result.locked) {
          setFreezeUntil(Date.now() + result.retryAfterMs);
          setRemainingFreeze(result.retryAfterMs);
        } else {
          resetTimer.current = window.setTimeout(() => setState((current) => current === 'denied' ? 'idle' : current), 750);
        }
      }
    }, 250);
  };

  return <main className={`security-screen perimeter-screen ${state === 'verified' ? 'gate-verified' : ''}`}><div className="security-grain" /><div className="security-orb" /><section className={`security-card perimeter-card ${state === 'denied' ? 'gate-denied' : ''}`}><div className="security-brand"><span className="security-mark"><i /><i /><i /><i /></span><span>NEXUS<span>BUSINESS ERP SAAS OS</span></span></div><div className={`security-emblem ${remainingFreeze ? 'frozen' : ''}`}><span /><Icon name="command" size={22} /><i /></div><p className="security-overline">CONTROLLED ACCESS · DEMO ENVIRONMENT</p><h1>{remainingFreeze ? 'Temporary demo lockout.' : 'Establish a secure link.'}</h1><p className="security-description">{remainingFreeze ? `Too many incorrect attempts. Try again in ${Math.ceil(remainingFreeze / 1000)} seconds.` : 'Enter the workspace demonstration token to continue to the Nexus sign-in suite.'}</p>{notice && <p className="session-notice" role="status">{notice}</p>}<form onSubmit={submit} className="perimeter-form"><label htmlFor="access-token">GLOBAL ACCESS TOKEN</label><div className={`token-input ${state === 'denied' ? 'invalid' : ''} ${state === 'verified' ? 'valid' : ''}`}><Icon name="command" size={18} /><input id="access-token" type="password" autoComplete="off" spellCheck={false} maxLength={7} disabled={Boolean(remainingFreeze) || busy} value={token} onChange={(event) => { setToken(event.target.value); setState('idle'); }} placeholder="Enter demonstration token" aria-describedby="gate-feedback" aria-invalid={state === 'denied'} /><span className="input-lock">LOCAL</span></div><p id="gate-feedback" className={`gate-feedback ${remainingFreeze ? 'denied' : state}`}>{remainingFreeze ? 'Temporary local attempt freeze · not cryptographic protection' : state === 'denied' ? 'Secure Link Denied · Token not recognized' : state === 'verified' ? 'Demo token verified · Opening sign-in…' : 'Local demo validation · No token is transmitted'}</p><button className="gate-submit" disabled={busy || state === 'verified' || Boolean(remainingFreeze)}>{remainingFreeze ? `Locked · ${Math.ceil(remainingFreeze / 1000)}s` : busy ? 'Verifying link…' : state === 'verified' ? 'Access granted' : 'Verify secure link'}<Icon name={state === 'verified' ? 'check' : 'arrow'} size={16} /></button></form><div className="security-footnote"><span><i />DEMO ACCESS GATE</span><span>CLIENT-SIDE ONLY · NOT AUTHENTICATION</span></div><p className="security-disclaimer">This prototype token is visible in the browser bundle. Browser-side controls can be bypassed; do not use this gate to protect production systems or sensitive data.</p></section><span className="security-corner">NEXUS SYSTEMS <i /> GATEWAY 01</span></main>;
}

function EnterpriseLogin({ onLogin, storageNotice }: { onLogin: (email: string, remember: boolean) => void; storageNotice: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!event.currentTarget.reportValidity()) return;
    const normalizedEmail = normalizeDemoEmail(email);
    if (!normalizedEmail) {
      setError('Enter a valid corporate email address.');
      return;
    }
    if (!isValidDemoPassword(password)) {
      setError('Use at least 8 characters for the demo password.');
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      onLogin(normalizedEmail, rememberDevice);
    }, 450);
  };

  return <main className="security-screen login-screen"><div className="login-glow" /><section className="login-card"><div className="login-brand"><span className="security-mark"><i /><i /><i /><i /></span><span>NEXUS<span>BUSINESS ERP SAAS OS</span></span></div><div className="login-heading"><span className="login-overline">YOUR BUSINESS, IN SYNC</span><h1>Welcome back.</h1><p>Sign in to your workspace to pick up where you left off.</p></div>{storageNotice && <p className="session-notice" role="status">{storageNotice}</p>}<form className="login-form" onSubmit={submit}><label className="floating-field"><input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder=" " /><span>Corporate email</span><i className={email.includes('@') ? 'field-valid' : ''}>{email.includes('@') ? <Icon name="check" size={15} /> : <Icon name="users" size={15} />}</i></label><label className="floating-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder=" " /><span>Demo password</span><button className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? 'Hide' : 'Show'}</button></label><div className="login-options"><label><input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} />Remember this demo device</label><button type="button" onClick={() => setError('Password recovery requires a production identity provider.')}>Forgot password?</button></div><p className="remember-note">Stores a local demo continuity record for up to 14 days. This is not an authenticated or encrypted session.</p>{error && <p className="login-error" role="alert">{error}</p>}<button className="login-submit" disabled={submitting}>{submitting ? 'Connecting to workspace…' : 'Sign in securely'}<Icon name="arrow" size={16} /></button></form><div className="login-divider"><span>OR CONTINUE WITH</span></div><button className="google-login" type="button" disabled={submitting} onClick={() => { const demoEmail = normalizeDemoEmail('alex.morgan@example.com'); if (!demoEmail) { setError('The demo identity is unavailable.'); return; } setError(''); setSubmitting(true); window.setTimeout(() => { setSubmitting(false); onLogin(demoEmail, rememberDevice); }, 450); }}><span className="google-g">G</span>Sign in with Google<Icon name="arrow" size={14} /></button><div className="oauth-badge"><span className="oauth-lock"><Icon name="command" size={15} /></span><span><strong>Federated identity · Demo simulation</strong><small>Production Google Cloud OAuth requires server-side provider configuration.</small></span><Icon name="check" size={14} /></div><div className="login-footer"><span><i />DEMO SIGN-IN · NO CREDENTIALS ARE SENT</span><button type="button" onClick={() => window.location.reload()}>Return to access gate</button></div></section></main>;
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><ModuleErrorBoundary label="عنصر لوحة التحكم">{children}</ModuleErrorBoundary></section>;
}

function PanelTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function RevenueChart() {
  return <div className="revenue-chart" role="img" aria-label="Monthly recurring revenue trending upward from January to December"><div className="chart-y-labels"><span>$240k</span><span>$180k</span><span>$120k</span><span>$60k</span></div><div className="chart-main"><div className="chart-grid"><i /><i /><i /><i /></div><svg className="chart-line" viewBox="0 0 720 190" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".22" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs><path d="M0 155 C30 147 38 130 65 139 S110 128 130 113 S170 125 196 103 S238 111 260 92 S305 109 325 79 S370 90 392 65 S435 82 455 54 S500 72 520 48 S560 59 586 34 S630 45 650 21 S690 27 720 10 V190 H0 Z" fill="url(#area-fill)" /><path d="M0 155 C30 147 38 130 65 139 S110 128 130 113 S170 125 196 103 S238 111 260 92 S305 109 325 79 S370 90 392 65 S435 82 455 54 S500 72 520 48 S560 59 586 34 S630 45 650 21 S690 27 720 10" fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg><div className="chart-x-labels">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => <span key={month}>{month}</span>)}</div></div></div>;
}

function VoiceAssistant({ onRun, page }: { onRun: (prompt: string) => void; page: PageId }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { decision, beginRequest, completeRequest, cancelRequest } = useAntiHallucination();
  const quickActions = assistantPrompts[page];

  const executeRequest = useCallback((request: string, displayText: string) => {
    setTranscript(displayText);
    const validated = completeRequest(request);
    if (validated.approved) onRun(request);
  }, [completeRequest, onRun]);

  useEffect(() => {
    if (!listening) return undefined;
    const timer = window.setTimeout(() => {
      setListening(false);
      const request = quickActions[0].action;
      setTranscript(quickActions[0].label);
      const validated = completeRequest(request);
      if (validated.approved) onRun(request);
    }, 2100);
    return () => window.clearTimeout(timer);
  }, [listening, completeRequest, onRun, quickActions]);

  const toggleListening = () => {
    if (listening) {
      setListening(false);
      cancelRequest();
      return;
    }
    beginRequest(quickActions[0].action);
    setListening(true);
  };

  return <Panel className="assistant-panel"><div className="assistant-copy"><span className="assistant-label"><span className="live-dot" />NEXUS INTELLIGENCE · {arabicNavigation[page]}</span><div className="assistant-welcome" lang="ar" dir="rtl">مرحباً بك في Nexus OS. كيف يمكنني مساعدتك في إدارة شركتك اليوم؟</div><p className="assistant-subtitle" lang="ar" dir="rtl">مساعدك الذكي جاهز — اختر مهمة للبدء.</p><div className="voice-transcript" aria-live="polite">{transcript && <><span lang="ar">آخر طلب</span><p>“{transcript}”</p></>}</div><div className="prompt-list" lang="ar" dir="rtl">{quickActions.map((prompt) => <button key={prompt.label} disabled={listening} onClick={() => executeRequest(prompt.action, prompt.label)}>{prompt.label}<Icon name="arrow" size={14} /></button>)}</div></div><div className={`voice-visual ${listening ? 'listening' : ''}`}><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="wave-bars" aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <i key={index} style={{ '--bar': `${18 + ((index * 19) % 48)}%` } as CSSProperties} />)}</div><button className="mic-button" onClick={toggleListening} aria-label={listening ? 'Stop listening' : 'Start listening'}><Icon name={listening ? 'close' : 'mic'} size={23} /></button><span className="mic-caption">{listening ? 'LISTENING…' : 'TAP TO SPEAK'}</span></div><section className="assistant-reasoning" lang="ar" dir="rtl" aria-live="polite"><h3>مسار اتخاذ القرار الذكي</h3>{decision ? <><p>{decision.status === 'checking' ? 'جارٍ التحقق من الطلب والإجراء المسموح به…' : decision.response}</p><ol>{decision.steps.map((step) => <li key={step}>{step}</li>)}</ol><small>{decision.status === 'checking' ? 'المعالجة جارية · محاكاة محلية' : 'إجراء محلي تجريبي · لا يوجد نموذج خارجي'}</small></> : <p>تُنفّذ الإجراءات المعتمدة فقط، استناداً إلى بيانات العرض المحلية.</p>}</section></Panel>;
}

function AssistantDock({ page, onRun }: { page: PageId; onRun: (prompt: string) => void }) {
  const [open, setOpen] = useState(false);
  const actions = assistantPrompts[page];
  return <div className="assistant-dock" dir="rtl" lang="ar"><button className={`assistant-dock-trigger ${open ? 'open' : ''}`} onClick={() => setOpen((current) => !current)} aria-expanded={open}><Icon name={open ? 'close' : 'spark'} size={17} /><span>مساعد Nexus</span><i /></button>{open && <section className="assistant-dock-panel" aria-label={`اقتراحات مساعد Nexus · ${arabicNavigation[page]}`}><span className="assistant-label"><span className="live-dot" />{arabicNavigation[page]}</span><strong>كيف أساعدك الآن؟</strong><p>اقتراحات تناسب مساحة العمل الحالية.</p>{actions.map((action) => <button key={action.label} onClick={() => { onRun(action.action); setOpen(false); }}>{action.label}<Icon name="arrow" size={13} /></button>)}</section>}</div>;
}

const welcomeSteps = [
  { title: 'ابدأ مع مساعد Nexus', detail: 'اختر اقتراحاً جاهزاً أو اكتب طلبك بصوتك.', target: 'مساعدك الذكي' },
  { title: 'تابع مؤشراتك بهدوء', detail: 'أهم أرقام شركتك واضحة هنا، وتتحدث تلقائياً.', target: 'ملخص الأداء' },
  { title: 'افتح التفاصيل عند الحاجة', detail: 'الطلبات والمهام والتحليلات منظمة في بطاقات قابلة للتوسيع.', target: 'بطاقات العمليات' },
];

function hasDismissedOnboarding() {
  try {
    return window.sessionStorage.getItem('nexus-onboarding-dismissed') === 'true';
  } catch {
    return false;
  }
}

function WelcomeTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => !hasDismissedOnboarding());
  if (!visible) return null;
  const current = welcomeSteps[step];
  const dismiss = () => {
    try {
      window.sessionStorage.setItem('nexus-onboarding-dismissed', 'true');
    } catch {
      // Dismissal remains available for this render when browser storage is blocked.
    }
    setVisible(false);
  };
  return <section className="welcome-guide" lang="ar" dir="rtl" aria-label="دليل البدء"><span className="guide-spark"><Icon name="spark" size={16} /></span><div className="guide-copy"><span className="guide-kicker">بداية هادئة · {step + 1} من {welcomeSteps.length}</span><strong>{current.title}</strong><p>{current.detail}</p><div className="guide-progress" aria-label={`الخطوة ${step + 1} من ${welcomeSteps.length}`}>{welcomeSteps.map((item, index) => <i className={index <= step ? 'complete' : ''} key={item.target} />)}</div></div><div className="guide-actions"><button className="guide-dismiss" onClick={dismiss}>تخطّي</button><button className="guide-next" onClick={() => step === welcomeSteps.length - 1 ? dismiss() : setStep((currentStep) => currentStep + 1)}>{step === welcomeSteps.length - 1 ? 'ابدأ الآن' : 'التالي'}<Icon name="arrow" size={13} /></button></div></section>;
}

function OverviewPage({ onRun }: { onRun: (prompt: string) => void }) {
  return <><PageHeading page="Overview" description="مساحة عملك، بوضوح وهدوء. كل ما تحتاجه في مكان واحد." /><WelcomeTour /><div className="metrics-grid zen-metrics"><Metric label="إجمالي الأرباح" value="$84,590" delta="+12.8%" icon="wallet" /><Metric label="المستخدمون النشطون" value="2,840" delta="+8.2%" icon="users" tone="violet" /><Metric label="سيولة المخزون" value="$92,640" delta="+6.4%" icon="boxes" tone="blue" /></div><section className="zen-host"><VoiceAssistant onRun={onRun} page="Overview" /></section><section className="zen-disclosures" lang="ar" dir="rtl"><details className="zen-disclosure"><summary><span className="disclosure-icon mint"><Icon name="chart" size={17} /></span><span className="disclosure-copy"><strong>الأداء المالي</strong><small>نظرة مبسطة على الإيرادات واتجاه النمو</small></span><span className="disclosure-hint">عرض التفاصيل</span><Icon className="disclosure-chevron" name="chevron" size={16} /></summary><div className="disclosure-content"><Panel className="revenue-panel"><PanelTitle title="Revenue overview" subtitle="Your revenue is up 12.8% from last year" /><div className="chart-key"><span><i className="key-dot" />Revenue</span><b>$284,590 <small>+12.8%</small></b></div><RevenueChart /></Panel></div></details><details className="zen-disclosure"><summary><span className="disclosure-icon blue"><Icon name="boxes" size={17} /></span><span className="disclosure-copy"><strong>الطلبات والمهام والتنبيهات</strong><small>العمليات اليومية مرتبة في مكان واحد</small></span><span className="disclosure-hint">عرض التفاصيل</span><Icon className="disclosure-chevron" name="chevron" size={16} /></summary><div className="disclosure-content"><ArabicOperations /></div></details><details className="zen-disclosure"><summary><span className="disclosure-icon violet"><Icon name="spark" size={17} /></span><span className="disclosure-copy"><strong>آخر تحديثات الشركة</strong><small>ملخص النشاط الأخير ومراحل المبيعات</small></span><span className="disclosure-hint">عرض التفاصيل</span><Icon className="disclosure-chevron" name="chevron" size={16} /></summary><div className="disclosure-content activity-disclosure"><Panel><PanelTitle title="Recent activity" /><div className="activity-list"><Activity icon="check" title="Invoice paid" detail="INV-2026-084 · Meridian Studio" time="2 min ago" /><Activity icon="users" title="New customer added" detail="Riley Cooper · Northstar Health" time="18 min ago" /><Activity icon="boxes" title="Stock running low" detail="Wireless Headset · 8 remaining" time="1 hr ago" /></div></Panel></div></details></section></>;
}

function ArabicOperations() {
  const [stream, setStream] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    const timer = window.setInterval(() => setStream((current) => current + 1), 7000);
    return () => window.clearInterval(timer);
  }, []);
  const orders = [
    { number: 'NX-2841', customer: 'شركة مدار للتقنية', product: 'خطة الأعمال · سنوي', amount: '١٢٬٤٠٠ ر.س', state: 'قيد التنفيذ', tone: 'blue' },
    { number: 'NX-2840', customer: 'مؤسسة أفق الإبداع', product: 'خطة النمو · شهري', amount: '٢٬٨٥٠ ر.س', state: 'تم الدفع', tone: 'mint' },
    { number: `NX-${2839 - stream}`, customer: 'مجموعة روافد', product: 'ترخيص مؤسسي', amount: '١٨٬٩٠٠ ر.س', state: 'مراجعة', tone: 'amber' },
  ];
  const tasks = [
    { id: 'invoice', title: 'مراجعة الفواتير المستحقة', detail: '٣ فواتير · أولوية عالية', tone: 'urgent' },
    { id: 'inventory', title: 'اعتماد طلب إعادة المخزون', detail: 'مخزون منخفض · قبل ١٢:٠٠ م', tone: 'normal' },
    { id: 'meeting', title: 'اجتماع فريق المبيعات', detail: 'اليوم · ٢:٣٠ م', tone: 'normal' },
  ];
  const alerts = [
    { id: 'stock', title: 'تنبيه انخفاض المخزون', detail: 'سماعات لاسلكية · ٨ وحدات متبقية', tone: 'amber' },
    { id: 'invoice', title: 'فاتورة تجاوزت موعد الاستحقاق', detail: 'INV-2026-082 · ٨٬٢٠٠ ر.س', tone: 'rose' },
    { id: 'uptime', title: 'جميع الأنظمة تعمل بشكل طبيعي', detail: 'آخر فحص قبل لحظات', tone: 'mint' },
  ];
  return <section className="arabic-operations" dir="rtl" aria-label="لوحة العمليات باللغة العربية"><header className="arabic-section-heading"><div><span className="arabic-live-dot" />تحديثات مباشرة <span>· آخر تحديث الآن</span></div><span className="arabic-stream-count">تدفق مباشر <i /></span></header><div className="arabic-grid"><section className="arabic-card orders-card"><header><div><h2>أحدث الطلبات</h2><p>متابعة الطلبات والتحصيلات</p></div><button onClick={() => window.dispatchEvent(new CustomEvent('nexus:navigate', { detail: 'Sales & CRM' }))}>عرض الكل <Icon name="arrow" size={14} /></button></header><div className="arabic-orders">{orders.map((order) => <article key={order.number}><span className="order-glyph"><Icon name="boxes" size={16} /></span><span className="order-details"><strong>{order.customer}</strong><small>{order.number} · {order.product}</small></span><span className="order-price"><strong>{order.amount}</strong><small className={`arabic-status ${order.tone}`}>{order.state}</small></span></article>)}</div><div className="orders-live-note"><span className="arabic-live-dot" />تمت مزامنة {stream + 3} طلبات اليوم</div></section><section className="arabic-card tasks-card"><header><div><h2>المواعيد والمهام</h2><p>أولويات فريقك لهذا اليوم</p></div><span className="task-count">{tasks.length - completed.length} مهام</span></header><div className="arabic-tasks">{tasks.map((task) => <label className={`arabic-task ${completed.includes(task.id) ? 'task-complete' : ''}`} key={task.id}><input type="checkbox" checked={completed.includes(task.id)} onChange={() => setCompleted((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])} /><span className={`task-priority ${task.tone}`} /><span><strong>{task.title}</strong><small>{task.detail}</small></span></label>)}</div><button className="add-task-button" onClick={() => setCompleted([])}><Icon name="plus" size={14} /> إعادة تعيين قائمة المهام</button></section><section className="arabic-card alerts-card"><header><div><h2>تنبيهات ذكية</h2><p>إشعارات تتطلب انتباهك</p></div><span className="alert-count">{alerts.filter((alert) => !dismissed.includes(alert.id)).length}</span></header><div className="arabic-alerts">{alerts.filter((alert) => !dismissed.includes(alert.id)).map((alert) => <article className={`arabic-alert ${alert.tone}`} key={alert.id}><i /><span><strong>{alert.title}</strong><small>{alert.detail}</small></span><button aria-label={`إخفاء التنبيه: ${alert.title}`} onClick={() => setDismissed((current) => [...current, alert.id])}>×</button></article>)}</div></section></div></section>;
}

function Activity({ icon, title, detail, time }: { icon: IconName; title: string; detail: string; time: string }) {
  return <div className="activity-item"><span className="activity-icon"><Icon name={icon} size={16} /></span><div className="activity-copy"><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div>;
}

function AssistantPage({ onRun, execution }: { onRun: (prompt: string) => void; execution: string }) {
  return <><PageHeading page="AI assistant" description="A capable partner for the questions and work that move your business forward." /><div className="assistant-layout"><VoiceAssistant onRun={onRun} page="AI assistant" /><Panel className="execution-panel"><PanelTitle title="Execution stream" subtitle="Activity from this local demo" action={<span className="live-badge"><i />DEMO</span>} /><div className="execution-list"><Activity icon="check" title="Local demo context loaded" detail="Sample Finance, CRM, People & inventory data" time="now" /><Activity icon="spark" title={execution || 'Ready when you are'} detail={execution ? 'Demo action completed' : 'Try an approved demo prompt'} time={execution ? 'just now' : '—'} /><Activity icon="clock" title="External data connection" detail="No backend or external service is connected" time="offline" /></div><div className="assistant-suggestions" lang="ar" dir="rtl"><h3>اقتراحات ذكية · {arabicNavigation['AI assistant']}</h3>{assistantPrompts['AI assistant'].map((prompt) => <button key={prompt.label} onClick={() => onRun(prompt.action)}>{prompt.label}<Icon name="arrow" size={14} /></button>)}</div></Panel></div></>;
}

function FinanceContent({ onRun }: { onRun: (prompt: string) => void }) {
  return <><PageHeading page="Finance" description="A clear picture of revenue, invoices, and the health of your business." action={<button className="button button-primary" onClick={() => onRun(prompts[3])}><Icon name="plus" size={16} />New transaction</button>} /><div className="metrics-grid"><Metric label="Cash balance" value="$184,290" delta="+8.4%" icon="wallet" /><Metric label="Monthly recurring" value="$48,290" delta="+14.6%" icon="trend" tone="violet" /><Metric label="Outstanding invoices" value="$12,840" delta="3 overdue" icon="clock" tone="amber" /><Metric label="Operating expenses" value="$32,610" delta="−2.1%" icon="chart" tone="blue" /></div><div className="dashboard-grid"><Panel className="revenue-panel"><PanelTitle title="Cash flow" subtitle="Inflow and outflow, year to date" action={<select aria-label="Cash flow period" defaultValue="This year"><option>This year</option><option>This quarter</option></select>} /><div className="cashflow-chart">{[54, 64, 43, 72, 59, 86, 68, 91, 60, 78, 88, 96].map((height, i) => <div className="cashflow-month" key={i}><div><i style={{ height: `${height}%` }} /><b style={{ height: `${Math.max(22, height - 24)}%` }} /></div><span>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</span></div>)}</div><div className="legend"><span><i className="key-dot" />Income</span><span><i className="key-dot expense" />Expenses</span></div></Panel><Panel><PanelTitle title="Expense breakdown" subtitle="This month" /><div className="expense-visual"><div className="donut-chart"><div><strong>$32.6k</strong><span>Total spend</span></div></div><div className="expense-list"><Expense label="Payroll" amount="$18,420" percent="56%" color="mint" /><Expense label="Operations" amount="$8,240" percent="25%" color="blue" /><Expense label="Marketing" amount="$4,560" percent="14%" color="violet" /><Expense label="Other" amount="$1,390" percent="5%" color="amber" /></div></div></Panel><Panel className="wide-panel"><PanelTitle title="Recent invoices" subtitle="Track payments and follow up on outstanding balances" action={<button className="text-button">All invoices <Icon name="arrow" size={14} /></button>} /><div className="table-wrap"><table><thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>{[['INV-2026-084', 'Meridian Studio', 'Oct 22, 2026', '$4,800', 'Paid'], ['INV-2026-083', 'Northstar Health', 'Oct 21, 2026', '$2,400', 'Pending'], ['INV-2026-082', 'Atlas Commerce', 'Oct 19, 2026', '$8,200', 'Overdue'], ['INV-2026-081', 'Solstice Group', 'Oct 18, 2026', '$3,600', 'Paid']].map((row) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td><span className={`status-pill ${row[4].toLowerCase()}`}>{row[4]}</span></td></tr>)}</tbody></table></div></Panel></div></>;
}

function FinancePage({ onRun, inventoryOnHand }: { onRun: (prompt: string) => void; inventoryOnHand: number }) {
  return <>
    <FinanceContent onRun={onRun} />
    <ModuleErrorBoundary label="أرشيف الفواتير"><InvoiceArchiver /></ModuleErrorBoundary>
    <ForecastPanel recurringRevenue={48290} inventoryOnHand={inventoryOnHand} />
    <Panel><PanelTitle title="Subscription lifecycle" subtitle="Recurring plans renewing across your workspace" /><div className="table-wrap"><table><thead><tr><th>SUBSCRIPTION</th><th>CUSTOMER</th><th>RENEWAL</th><th>MONTHLY VALUE</th><th>STATUS</th></tr></thead><tbody>{[['Growth plan', 'Meridian Studio', 'Oct 28, 2026', '$1,200', 'Active'], ['Business plan', 'Northstar Health', 'Nov 02, 2026', '$840', 'Active'], ['Starter plan', 'Atlas Commerce', 'Nov 05, 2026', '$240', 'Trial'], ['Enterprise plan', 'Solstice Group', 'Oct 26, 2026', '$2,400', 'Active']].map((row) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td><span className={`status-pill ${row[4] === 'Active' ? 'paid' : 'pending'}`}>{row[4]}</span></td></tr>)}</tbody></table></div></Panel>
  </>;
}

function Expense({ label, amount, percent, color }: { label: string; amount: string; percent: string; color: string }) {
  return <div className="expense-item"><span className={`key-dot ${color}`} /><span>{label}</span><strong>{amount}</strong><small>{percent}</small></div>;
}

function CrmPage({ deals, setDeals }: { deals: Deal[]; setDeals: (deals: Deal[]) => void }) {
  const stages: Stage[] = ['Qualified', 'Proposal', 'Negotiation', 'Won'];
  const [dragged, setDragged] = useState<number | null>(null);
  const moveDeal = (id: number, direction: number) => setDeals(deals.map((deal) => {
    if (deal.id !== id) return deal;
    return { ...deal, stage: stages[Math.max(0, Math.min(stages.length - 1, stages.indexOf(deal.stage) + direction))] };
  }));
  return <><PageHeading page="Sales & CRM" description="Build relationships, move deals forward, and grow your pipeline." action={<button className="button button-primary" onClick={() => setDeals([...deals, { id: Date.now(), company: 'New opportunity', contact: 'Add a contact', value: 9800, stage: 'Qualified', color: 'blue' }])}><Icon name="plus" size={16} />Add opportunity</button>} /><div className="crm-summary"><span><b>{deals.length}</b> open opportunities</span><span>Pipeline value <b>${deals.reduce((sum, deal) => sum + deal.value, 0).toLocaleString()}</b></span><span>Win rate <b>32.8%</b></span></div><div className="kanban-board">{stages.map((stage, stageIndex) => <section className="kanban-column" key={stage} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== null) setDeals(deals.map((deal) => deal.id === dragged ? { ...deal, stage } : deal)); setDragged(null); }}><div className="kanban-heading"><span className={`stage-dot stage-${stageIndex}`} />{stage}<span>{deals.filter((deal) => deal.stage === stage).length}</span><button aria-label={`Add deal to ${stage}`} onClick={() => setDeals([...deals, { id: Date.now(), company: 'New opportunity', contact: 'Add a contact', value: 9800, stage, color: 'blue' }])}><Icon name="plus" size={15} /></button></div>{deals.filter((deal) => deal.stage === stage).map((deal) => <article className="deal-card" key={deal.id} draggable onDragStart={() => setDragged(deal.id)} onDragEnd={() => setDragged(null)}><div className="deal-top"><span className={`company-avatar ${deal.color}`}>{deal.company.charAt(0)}</span><button aria-label={`More options for ${deal.company}`} className="icon-button"><Icon name="more" size={16} /></button></div><strong>{deal.company}</strong><span className="deal-contact">{deal.contact}</span><div className="deal-value">${deal.value.toLocaleString()}</div><div className="deal-footer"><span className="contact-avatar">{deal.contact.split(' ').map((part) => part[0]).join('')}</span><span>Updated today</span><div className="deal-controls"><button aria-label="Move deal to previous stage" disabled={stageIndex === 0} onClick={() => moveDeal(deal.id, -1)}>‹</button><button aria-label="Move deal to next stage" disabled={stageIndex === stages.length - 1} onClick={() => moveDeal(deal.id, 1)}>›</button></div></div></article>)}</section>)}</div></>;
}

const employees = [
  { name: 'Alex Morgan', title: 'Chief Executive Officer', team: 'Leadership', initials: 'AM', color: 'lilac', status: 'In office' },
  { name: 'Maya Chen', title: 'VP of Product', team: 'Product', initials: 'MC', color: 'blue', status: 'In office' },
  { name: 'James Wilson', title: 'Finance Director', team: 'Finance', initials: 'JW', color: 'orange', status: 'Remote' },
  { name: 'Sofia Patel', title: 'People Operations Lead', team: 'People', initials: 'SP', color: 'green', status: 'In office' },
  { name: 'Oliver Kim', title: 'Engineering Lead', team: 'Engineering', initials: 'OK', color: 'pink', status: 'Remote' },
  { name: 'Eva Laurent', title: 'Growth Marketing', team: 'Marketing', initials: 'EL', color: 'yellow', status: 'In office' },
];

function PeoplePage() {
  const [team, setTeam] = useState(employees);
  return <><PageHeading page="People" description="Your people operations, thoughtfully organized." action={<button className="button button-primary" onClick={() => setTeam((current) => [...current, { name: `New teammate ${current.length - employees.length + 1}`, title: 'New team member', team: 'Unassigned', initials: 'NT', color: 'blue', status: 'Invited' }])}><Icon name="plus" size={16} />Add employee</button>} /><div className="metrics-grid"><Metric label="Team members" value={`${48 + team.length - employees.length}`} delta="+4 this quarter" icon="users" /><Metric label="Payroll this month" value="$286,400" delta="Processed Oct 20" icon="wallet" tone="violet" /><Metric label="On leave today" value="3" delta="Across 2 teams" icon="clock" tone="amber" /><Metric label="Open positions" value="6" delta="2 new this month" icon="briefcase" tone="blue" /></div><Panel><PanelTitle title="Team directory" subtitle="Meet the people who make it happen" action={<input className="table-search" placeholder="Search team…" aria-label="Search team" />} /><div className="employee-grid">{team.map((person) => <article className="employee-card" key={person.name}><div className={`employee-avatar ${person.color}`}>{person.initials}</div><strong>{person.name}</strong><span>{person.title}</span><div className="employee-meta"><span>{person.team}</span><span className="presence"><i />{person.status}</span></div></article>)}</div></Panel><Panel><PanelTitle title="Today’s schedule" subtitle="Thursday, October 23" action={<button className="text-button">View calendar <Icon name="arrow" size={14} /></button>} /><div className="schedule-list"><Schedule time="09:00" title="Product design sync" team="Product · Maya Chen, Oliver Kim" color="blue" /><Schedule time="10:30" title="Weekly finance review" team="Finance · James Wilson, Alex Morgan" color="mint" /><Schedule time="13:00" title="Candidate interview — Senior Designer" team="People · Sofia Patel" color="violet" /></div></Panel></>;
}

function Schedule({ time, title, team, color }: { time: string; title: string; team: string; color: string }) {
  return <div className="schedule-row"><time>{time}</time><i className={`schedule-marker ${color}`} /><div><strong>{title}</strong><span>{team}</span></div><button className="icon-button" aria-label="Schedule options"><Icon name="more" size={16} /></button></div>;
}

function InventoryPage({ onRestock, stock }: { onRestock: (name: string) => void; stock: number }) {
  const items = [{ name: 'Wireless Headset', sku: 'WH-240 · Accessories', stock, target: 25, category: 'Electronics', price: '$89.00' }, { name: 'USB-C Hub Pro', sku: 'HC-110 · Accessories', stock: 34, target: 15, category: 'Electronics', price: '$64.00' }, { name: 'Ergonomic Desk Chair', sku: 'DC-480 · Furniture', stock: 12, target: 10, category: 'Furniture', price: '$320.00' }, { name: 'Standing Desk Frame', sku: 'SF-220 · Furniture', stock: 8, target: 12, category: 'Furniture', price: '$410.00' }, { name: 'Studio Monitor 4K', sku: 'SM-400 · Electronics', stock: 18, target: 8, category: 'Electronics', price: '$580.00' }];
  return <><PageHeading page="Inventory" description="Know what’s in stock, what’s moving, and what needs attention." action={<button className="button button-primary" onClick={() => onRestock('New inventory item')}><Icon name="plus" size={16} />Add item</button>} /><div className="metrics-grid"><Metric label="Total assets" value="1,284" delta="Across 8 categories" icon="boxes" /><Metric label="Inventory value" value="$92,640" delta="+6.4%" icon="wallet" tone="violet" /><Metric label="Low stock items" value={stock < 15 ? '2' : '1'} delta="Needs attention" icon="bell" tone="amber" /><Metric label="Open purchase orders" value="4" delta="$12,840 total" icon="briefcase" tone="blue" /></div><Panel><PanelTitle title="Stock overview" subtitle="Track available items and reorder before you run low" action={<button className="text-button">All categories <Icon name="chevron" size={14} /></button>} /><div className="table-wrap"><table><thead><tr><th>ITEM</th><th>SKU</th><th>AVAILABLE</th><th>UNIT PRICE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{items.map((item) => <tr key={item.name}><td><span className="inventory-name"><span className="inventory-icon"><Icon name="boxes" size={16} /></span>{item.name}</span></td><td>{item.sku}</td><td><span className="stock-count">{item.stock} <small>/ {item.target} min</small></span><span className="stock-track"><i className={item.stock <= item.target ? 'low' : ''} style={{ width: `${Math.min(100, item.stock / (item.target * 2) * 100)}%` }} /></span></td><td>{item.price}</td><td><span className={`status-pill ${item.stock <= item.target ? 'overdue' : 'paid'}`}>{item.stock <= item.target ? 'Low stock' : 'In stock'}</span></td><td><button className="text-button" onClick={() => onRestock(item.name)}>{item.stock <= item.target ? 'Reorder' : 'Restock'} <Icon name="arrow" size={13} /></button></td></tr>)}</tbody></table></div></Panel></>;
}

function AnalyticsPage({ inventoryOnHand }: { inventoryOnHand: number }) {
  return <>
    <PageHeading page="Analytics" description="A real-time view of the signals shaping your business." action={<button className="button button-secondary"><Icon name="clock" size={15} />Last 30 days <Icon name="chevron" size={14} /></button>} />
    <div className="metrics-grid"><Metric label="Gross volume" value="$1.24M" delta="+18.2%" icon="trend" /><Metric label="Customer retention" value="94.8%" delta="+2.4%" icon="users" tone="violet" /><Metric label="Avg. order value" value="$482" delta="+6.8%" icon="wallet" tone="blue" /><Metric label="Growth efficiency" value="3.2×" delta="+0.4×" icon="chart" tone="amber" /></div>
    <ForecastPanel recurringRevenue={48290} inventoryOnHand={inventoryOnHand} />
    <div className="dashboard-grid"><Panel className="revenue-panel"><PanelTitle title="Performance trends" subtitle="Revenue, customers, and orders over time" /><RevenueChart /></Panel><Panel><PanelTitle title="Revenue by channel" subtitle="Share of total revenue" /><div className="channel-chart"><div className="channel-donut"><span><strong>$284k</strong><small>Total revenue</small></span></div><div className="expense-list"><Expense label="Direct" amount="$142k" percent="50%" color="mint" /><Expense label="Partners" amount="$85k" percent="30%" color="blue" /><Expense label="Organic" amount="$57k" percent="20%" color="violet" /></div></div></Panel><Panel className="wide-panel"><PanelTitle title="Operational health" subtitle="A live overview of connected business functions" /><div className="health-grid">{[['Finance', 'All systems operational', 'mint'], ['Sales & CRM', '7 opportunities active', 'blue'], ['People', '48 team members', 'violet'], ['Inventory', '2 items need attention', 'amber']].map(([name, status, color]) => <div className="health-card" key={name}><span className={`health-icon ${color}`}><Icon name={name === 'Finance' ? 'wallet' : name === 'Sales & CRM' ? 'users' : name === 'People' ? 'briefcase' : 'boxes'} size={18} /></span><strong>{name}</strong><span><i className={`health-dot ${color}`} />{status}</span></div>)}</div></Panel></div>
  </>;
}

export function App() {
  const [initialDemoSession] = useState<DemoSessionRead>(() => readDemoSession());
  const [accessStage, setAccessStage] = useState<AccessStage>(() => initialDemoSession.session ? 'workspace' : 'perimeter');
  const [userEmail, setUserEmail] = useState(initialDemoSession.session?.email ?? 'alex.morgan@example.com');
  const [rememberedSession, setRememberedSession] = useState<DemoSession | null>(initialDemoSession.session);
  const [storageNotice, setStorageNotice] = useState(initialDemoSession.notice);
  const [activePage, setActivePage] = useState<PageId>('Overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [workspace, setWorkspace] = useState('Acme Studio');
  const [commandOpen, setCommandOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [execution, setExecution] = useState('');
  const [stock, setStock] = useState(8);
  const [deals, setDeals] = useState(initialDeals);
  const [toast, setToast] = useState('');

  const runAction = useCallback((prompt: string) => {
    if (!resolveTrustedAssistantRequest(prompt)) {
      setToast('This request is not in the approved demo action list.');
      return;
    }
    const normalized = prompt.toLowerCase();
    const title = normalized.includes('payroll') ? 'Payroll demo review complete' : normalized.includes('inventory') ? 'Inventory demo review complete' : normalized.includes('cash flow') ? 'Demo cash flow summary ready' : normalized.includes('synced leads') ? 'Demo leads reviewed' : 'Demo sales report ready';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setExecution(title);
    setWorkflows((current) => [{ id: Date.now(), title, state: 'running' as const, time: now }, ...current].slice(0, 4));
    if (normalized.includes('payroll')) setToast('Demo payroll review complete — sample data only.');
    else if (normalized.includes('inventory')) setToast('Demo inventory review complete — sample data only.');
    else if (normalized.includes('cash flow')) setToast('Demo cash flow summary is ready — sample data only.');
    else if (normalized.includes('synced leads')) setToast('Demo leads are ready in Sales & CRM.');
    else setToast('Demo sales report is ready — sample data only.');
  }, []);

  useEffect(() => {
    const activeWorkflows = workflows.filter((workflow) => workflow.state === 'running');
    if (!activeWorkflows.length) return undefined;
    const timers = activeWorkflows.map((workflow) => window.setTimeout(() => {
      setWorkflows((current) => current.map((item) => item.id === workflow.id ? { ...item, state: 'complete' } : item));
    }, 2600));
    return () => timers.forEach(window.clearTimeout);
  }, [workflows]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const appName = import.meta.env.VITE_APP_NAME || 'Nexus business ERP SaaS OS';
    document.documentElement.dataset.environment = import.meta.env.VITE_APP_ENVIRONMENT || 'demo';
    document.title = `${activePage} · ${appName}`;
  }, [activePage]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
        setTrayOpen(false);
      }
    };
    const handleNavigation = (event: Event) => {
      const page = (event as CustomEvent<PageId>).detail;
      if (navigation.some((item) => item.id === page)) setActivePage(page);
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('nexus:navigate', handleNavigation);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('nexus:navigate', handleNavigation);
    };
  }, []);

  useEffect(() => {
    if (accessStage !== 'workspace' || !rememberedSession) return undefined;
    const lockIfChanged = () => {
      const current = readDemoSession().session;
      const isSameSession = current
        && current.email === rememberedSession.email
        && current.deviceId === rememberedSession.deviceId
        && current.expiresAt === rememberedSession.expiresAt;
      if (isSameSession) return;

      const notice = forgetDemoSession();
      setRememberedSession(null);
      setStorageNotice(notice || 'Remembered demo session changed or expired. Please pass the demo gate again.');
      setActivePage('Overview');
      setAccessStage('perimeter');
    };
    const timer = window.setTimeout(lockIfChanged, Math.max(0, rememberedSession.expiresAt - Date.now()));
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === DEMO_SESSION_STORAGE_KEY || event.key === DEMO_DEVICE_STORAGE_KEY) {
        lockIfChanged();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', lockIfChanged);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', lockIfChanged);
    };
  }, [accessStage, rememberedSession]);

  const groupedItems = useMemo(() => navigation.reduce<Record<string, typeof navigation>>((groups, item) => {
    groups[item.group] = [...(groups[item.group] ?? []), item];
    return groups;
  }, {}), []);

  const restock = (name: string) => {
    setStock((current) => current + 20);
    setWorkflows((current) => [{ id: Date.now(), title: `Supplier order placed · ${name}`, state: 'running' as const, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...current].slice(0, 4));
    setToast(`Supplier order placed for ${name}.`);
  };

  const completeLogin = (email: string, remember: boolean) => {
    if (remember) {
      const result = rememberDemoSession(email);
      setRememberedSession(result.session);
      setStorageNotice(result.notice);
    } else {
      setRememberedSession(null);
      setStorageNotice(forgetDemoSession());
    }
    setUserEmail(email);
    setAccessStage('workspace');
  };

  const signOut = () => {
    setRememberedSession(null);
    setStorageNotice(forgetDemoSession());
    setUserEmail('alex.morgan@example.com');
    setActivePage('Overview');
    setAccessStage('perimeter');
  };

  const syncSocialLead = (channelName: string) => {
    const safeChannelName = sanitizePlainText(channelName, 40).trim();
    if (!safeChannelName) {
      setToast('The demo channel name is invalid.');
      return;
    }
    setDeals((current) => [...current, {
      id: Math.max(Date.now(), ...current.map((deal) => deal.id)) + 1,
      company: `${safeChannelName} demo inquiry`,
      contact: 'New social lead',
      value: 4800,
      stage: 'Qualified',
      color: 'violet',
    }]);
    setToast(`Demo lead from ${safeChannelName} added to Sales & CRM.`);
  };

  const filteredNavigation = navigation.filter((item) => item.id.toLowerCase().includes(search.toLowerCase()));

  if (accessStage === 'perimeter') {
    return <PerimeterGate notice={storageNotice} onUnlock={() => setAccessStage('login')} />;
  }
  if (accessStage === 'login') {
    return <EnterpriseLogin storageNotice={storageNotice} onLogin={completeLogin} />;
  }

  return <div className="app-shell" data-theme={theme} dir="rtl" lang="ar">
    <aside className="sidebar"><div><button className="brand-lockup" aria-label="Nexus business ERP SaaS OS home" onClick={() => setActivePage('Overview')}><span className="brand-symbol"><span /><span /><span /><span /></span><span className="brand-name">nexus<span>business ERP SaaS OS</span></span></button><button className="workspace-switcher" onClick={() => setWorkspace((current) => current === 'Acme Studio' ? 'Northstar Group' : 'Acme Studio')}><span className="workspace-mark">{workspace === 'Acme Studio' ? 'A' : 'N'}</span><span><strong>{workspace}</strong><small>مساحة العمل المؤسسية</small></span><Icon name="chevron" size={15} /></button>{Object.entries(groupedItems).map(([group, items]) => <nav className="nav-group" key={group} aria-label={group === 'WORKSPACE' ? 'مساحة العمل' : group === 'BUSINESS' ? 'إدارة الأعمال' : 'التحليلات والتكاملات'}>{items.map((item) => <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}><Icon name={item.icon} size={17} /><span>{arabicNavigation[item.id]}</span>{item.id === 'Analytics' && <i className="nav-count">٣</i>}{item.id === 'Inventory' && <i className="nav-count">٢</i>}</button>)}</nav>)}</div><div className="sidebar-bottom"><div className="upgrade-card"><span className="upgrade-icon"><Icon name="spark" size={16} /></span><strong>اجعل أعمالك أكثر كفاءة</strong><p>اكتشف إمكانات الذكاء الاصطناعي لفريقك.</p><button onClick={() => setActivePage('AI assistant')}>استكشف مساعد Nexus <Icon name="arrow" size={13} /></button></div><button className="profile-button" onClick={signOut}><span className="profile-avatar">AM</span><span><strong>{userEmail}</strong><small>مدير مساحة العمل · تسجيل الخروج</small></span><Icon name="more" size={16} /></button></div></aside>
    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><span>{workspace}</span><span>/</span><strong>{arabicNavigation[activePage]}</strong></div>
        <div className="topbar-actions">
          <button className="search-trigger" onClick={() => setCommandOpen(true)}><Icon name="search" size={16} /><span>ابحث في مساحة العمل</span><kbd>⌘ K</kbd></button>
          <button className="icon-button theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} /></button>
          <button className="icon-button notification-button" aria-label="الإشعارات"><Icon name="bell" size={17} /><i /></button>
          <span className="topbar-divider" /><div className="topbar-profile"><span className="profile-avatar">AM</span><Icon name="chevron" size={14} /></div>
        </div>
      </header>
      <div className="page-content">
        <ModuleErrorBoundary key={activePage} label={arabicNavigation[activePage]}>
        {activePage === 'Overview' && <OverviewPage onRun={runAction} />}
        {activePage === 'AI assistant' && <AssistantPage onRun={runAction} execution={execution} />}
        {activePage === 'Finance' && <FinancePage onRun={runAction} inventoryOnHand={stock} />}
        {activePage === 'Sales & CRM' && <CrmPage deals={deals} setDeals={setDeals} />}
        {activePage === 'People' && <PeoplePage />}
        {activePage === 'Inventory' && <InventoryPage onRestock={restock} stock={stock} />}
        {activePage === 'Analytics' && <AnalyticsPage inventoryOnHand={stock} />}
        {activePage === 'Integrations' && <IntegrationHub onSyncLead={syncSocialLead} />}
        </ModuleErrorBoundary>
      </div>
      <footer className="app-footer"><span><i className="health-dot mint" />All systems operational</span><span>© 2026 Nexus business ERP SaaS OS <span className="footer-separator">·</span> Built for better business</span></footer>
    </main>
    {activePage !== 'Overview' && activePage !== 'AI assistant' && <AssistantDock page={activePage} onRun={runAction} />}
    <button className={`system-tray-button ${workflows.some((workflow) => workflow.state === 'running') ? 'has-running' : ''}`} onClick={() => setTrayOpen((open) => !open)} aria-label={`Background workflows${workflows.some((workflow) => workflow.state === 'running') ? ', running' : ''}`}><span className="tray-pulse" /><Icon name="command" size={17} />{workflows.some((workflow) => workflow.state === 'running') && <i />}</button>
    {trayOpen && <div className="workflow-tray"><div className="tray-heading"><div><strong>Background activity</strong><span>{workflows.filter((workflow) => workflow.state === 'running').length} running</span></div><button className="icon-button" onClick={() => setTrayOpen(false)} aria-label="Close activity panel"><Icon name="close" size={16} /></button></div>{workflows.length ? workflows.map((workflow) => <div className="workflow-item" key={workflow.id}><span className={`workflow-status ${workflow.state}`}><Icon name={workflow.state === 'complete' ? 'check' : 'clock'} size={14} /></span><span><strong>{workflow.title}</strong><small>{workflow.state === 'complete' ? 'Completed' : 'Working in the background'} · {workflow.time}</small></span></div>) : <p className="empty-state">Your background activity will appear here.</p>}</div>}
    {commandOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><section className="command-modal" role="dialog" aria-modal="true" aria-label="Search Nexus"><div className="command-input"><Icon name="search" size={19} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages and tools…" /><kbd>ESC</kbd></div><span className="command-caption">PAGES & WORKSPACES</span>{filteredNavigation.map((item) => <button className="command-result" key={item.id} onClick={() => { setActivePage(item.id); setCommandOpen(false); setSearch(''); }}><span className="command-icon"><Icon name={item.icon} size={16} /></span>{item.id}<kbd>↵</kbd></button>)}{filteredNavigation.length === 0 && <p className="empty-state">No matching pages. Try another search.</p>}<div className="command-hint"><Icon name="command" size={14} />Nexus global search <span>Search your business, naturally.</span></div></section></div>}
    {toast && <div className="toast" role="status"><span><Icon name="check" size={16} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><Icon name="close" size={14} /></button></div>}
  </div>;
}
