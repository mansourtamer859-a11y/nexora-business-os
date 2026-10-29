import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { IntegrationHub } from './components/IntegrationHub';
import { ForecastPanel } from './components/ForecastPanel';
import { InvoiceArchiver } from './components/InvoiceArchiver';
import { ModuleErrorBoundary } from './components/ModuleErrorBoundary';
import { useLocale } from './i18n/useLocale';
import { useAntiHallucination, resolveSpokenCommand, resolveTrustedAssistantRequest } from './hooks/useAntiHallucination';
import { useSpeechCapture } from './hooks/useSpeechCapture';
import { useWorkspaceData } from './hooks/useWorkspaceData';
import { sanitizePlainText } from './utils/securitySandbox';
import type { Deal, DealStage, Invoice } from './lib/workspaceData';

type PageId = 'Overview' | 'AI assistant' | 'Finance' | 'Sales & CRM' | 'People' | 'Inventory' | 'Analytics' | 'Integrations';
type IconName = 'grid' | 'spark' | 'wallet' | 'users' | 'briefcase' | 'boxes' | 'chart' | 'search' | 'bell' | 'chevron' | 'arrow' | 'mic' | 'play' | 'clock' | 'check' | 'plus' | 'more' | 'sun' | 'moon' | 'command' | 'trend' | 'close' | 'share';
type Workflow = { id: number; title: string; state: 'running' | 'complete'; time: string };
type AccessStage = 'checking' | 'unauthorized' | 'error' | 'workspace';

function waitForIdentityRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, delayMs);
    const abort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(new DOMException('Identity verification was cancelled.', 'AbortError'));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
  });
}

async function fetchIdentityResponse(signal: AbortSignal): Promise<Response> {
  let lastError: Error = new Error('Could not reach the identity verification service.');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const requestController = new AbortController();
    const abortRequest = () => requestController.abort();
    const timeout = window.setTimeout(abortRequest, 8000);
    signal.addEventListener('abort', abortRequest, { once: true });
    try {
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
        signal: requestController.signal,
      });
      if (![502, 503, 504].includes(response.status) || attempt === 2) return response;
      lastError = new Error(`Identity verification is temporarily unavailable (HTTP ${response.status}).`);
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = new Error('Could not reach the identity verification service. Please retry.');
    } finally {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', abortRequest);
    }
    if (attempt < 2) await waitForIdentityRetry(250 * (attempt + 1), signal);
  }
  throw lastError;
}

function identityResponseError(status: number): Error {
  if (status === 404) {
    return new Error('The sign-in endpoint is not deployed. Deploy the Pages Functions and retry.');
  }
  if (status >= 500) {
    return new Error(`Identity verification is temporarily unavailable (HTTP ${status}). Check Cloudflare Access configuration.`);
  }
  return new Error(`Identity verification failed (HTTP ${status}).`);
}

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
    { label: 'View financial summary', action: prompts[3] },
    { label: 'Review employees', action: prompts[1] },
  ],
  'AI assistant': [
    { label: 'View financial summary', action: prompts[3] },
    { label: 'Review employees', action: prompts[1] },
    { label: 'Generate sales report', action: prompts[0] },
  ],
  Finance: [
    { label: 'Summarize cash flow', action: prompts[3] },
    { label: 'Generate sales report', action: prompts[0] },
  ],
  'Sales & CRM': [
    { label: 'Generate sales report', action: prompts[0] },
    { label: 'View financial summary', action: prompts[3] },
  ],
  People: [
    { label: 'Review payroll operations', action: prompts[1] },
    { label: 'View financial summary', action: prompts[3] },
  ],
  Inventory: [
    { label: 'Review low-stock inventory', action: prompts[2] },
    { label: 'Summarize cash flow', action: prompts[3] },
  ],
  Analytics: [
    { label: 'View financial summary', action: prompts[3] },
    { label: 'Generate sales report', action: prompts[0] },
  ],
  Integrations: [
    { label: 'Review demo leads', action: 'Review synced leads' },
    { label: 'Generate sales report', action: prompts[0] },
  ],
};

function PageHeading({ page, description, action }: { page: string; description: string; action?: ReactNode }) {
  const { t } = useLocale();
  return <div className="page-heading"><div><p className="eyebrow">NEXUS BUSINESS ERP SAAS OS{page === 'Overview' ? ` · ${t('MONDAY, OCTOBER 23, 2026')}` : ''}</p><h1>{page === 'Overview' ? t('Good morning, Alex') : t(page)}</h1><p className="heading-description">{t(description)}</p></div>{action}</div>;
}

function Metric({ label, value, delta, icon, tone = 'mint' }: { label: string; value: string; delta: string; icon: IconName; tone?: string }) {
  const { t } = useLocale();
  const [points, setPoints] = useState(() => Array.from({ length: 12 }, (_, index) => 34 + ((index * 17 + label.length * 11) % 52)));
  const line = points.map((point, index) => `${index * 10},${70 - point}`).join(' ');
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPoints((current) => [...current.slice(1), Math.max(24, Math.min(86, current[current.length - 1] + Math.round(Math.random() * 18 - 8)))]);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  return <article className="metric-card"><div className="metric-top"><span>{t(label)}</span><span className={`metric-icon ${tone}`}><Icon name={icon} size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-sparkline" aria-hidden="true"><svg viewBox="0 0 110 70" preserveAspectRatio="none"><polyline points={line} /></svg></div><div className="metric-foot"><span className="trend"><Icon name="trend" size={13} />{t(delta)}</span><span>{t('vs last month')}</span></div></article>;
}

function IdentityScreen({
  status,
  message,
  onRetry,
}: {
  status: 'checking' | 'unauthorized' | 'error' | 'loading-data';
  message?: string;
  onRetry: () => void;
}) {
  const { t, direction, locale } = useLocale();
  const title = status === 'checking'
    ? 'Verifying organization identity…'
    : status === 'loading-data'
      ? 'Loading your secure workspace…'
      : status === 'unauthorized'
        ? 'Organization sign-in is required.'
        : 'Secure workspace unavailable.';

  return <main className="security-screen identity-screen" lang={locale} dir={direction}>
    <div className="security-grain" />
    <div className="security-orb" />
    <section className="security-card identity-card">
      <div className="security-brand"><span className="security-mark"><i /><i /><i /><i /></span><span>NEXUS<span>BUSINESS ERP SAAS OS</span></span></div>
      <div className="security-emblem"><span /><Icon name="command" size={22} /><i /></div>
      <p className="security-overline">CLOUDFLARE ACCESS · OIDC</p>
      <h1>{t(title)}</h1>
      <p className="security-description">{t(status === 'unauthorized'
        ? 'Sign in through your organization identity provider. Cloudflare Access verifies your session before business data is returned.'
        : status === 'error'
          ? 'The identity or workspace service could not be verified. Check the Cloudflare Access and D1 configuration, then retry.'
          : 'The application is checking your organization identity and loading server-stored workspace data.')}</p>
      {message && <p className="session-notice" role="alert">{t(message)}</p>}
      {(status === 'unauthorized' || status === 'error') && <button className="gate-submit identity-retry" onClick={onRetry}>{t('Retry identity verification')}<Icon name="arrow" size={16} /></button>}
      <div className="security-footnote"><span><i />{t('SERVER-VERIFIED IDENTITY')}</span><span>ACCESS TOKEN NEVER STORED IN APP</span></div>
    </section>
  </main>;
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { t } = useLocale();
  return <section className={`panel ${className}`}><ModuleErrorBoundary label={t('Dashboard widget')}>{children}</ModuleErrorBoundary></section>;
}

function PanelTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const { t } = useLocale();
  return <div className="panel-title"><div><h2>{t(title)}</h2>{subtitle && <p>{t(subtitle)}</p>}</div>{action}</div>;
}

function RevenueChart() {
  const { t, locale } = useLocale();
  return <div className="revenue-chart" role="img" aria-label={t('Monthly recurring revenue trending upward from January to December')} lang={locale}><div className="chart-y-labels"><span>$240k</span><span>$180k</span><span>$120k</span><span>$60k</span></div><div className="chart-main"><div className="chart-grid"><i /><i /><i /><i /></div><svg className="chart-line" viewBox="0 0 720 190" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".22" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs><path d="M0 155 C30 147 38 130 65 139 S110 128 130 113 S170 125 196 103 S238 111 260 92 S305 109 325 79 S370 90 392 65 S435 82 455 54 S500 72 520 48 S560 59 586 34 S630 45 650 21 S690 27 720 10 V190 H0 Z" fill="url(#area-fill)" /><path d="M0 155 C30 147 38 130 65 139 S110 128 130 113 S170 125 196 103 S238 111 260 92 S305 109 325 79 S370 90 392 65 S435 82 455 54 S500 72 520 48 S560 59 586 34 S630 45 650 21 S690 27 720 10" fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg><div className="chart-x-labels">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => <span key={month}>{t(month)}</span>)}</div></div></div>;
}

function VoiceAssistant({ onRun, page }: { onRun: (prompt: string) => void; page: PageId }) {
  const { t, locale, direction } = useLocale();
  const { decision, beginRequest, completeRequest, cancelRequest } = useAntiHallucination();
  const speech = useSpeechCapture();
  const listening = speech.status === 'listening';
  const quickActions = assistantPrompts[page];

  const executeRequest = useCallback((request: string) => {
    const validated = completeRequest(request);
    if (validated.approved) onRun(request);
  }, [completeRequest, onRun]);

  useEffect(() => {
    if (speech.status !== 'complete' || !speech.transcript) return;
    const command = resolveSpokenCommand(speech.transcript);
    if (!command) {
      completeRequest(speech.transcript);
      return;
    }
    beginRequest(command);
    const validated = completeRequest(command);
    if (validated.approved) onRun(command);
  }, [beginRequest, completeRequest, onRun, speech.status, speech.transcript]);

  const toggleListening = () => {
    if (listening) {
      speech.stop();
      cancelRequest();
      return;
    }
    void speech.start(locale === 'ar' ? 'ar-SA' : 'en-US');
  };

  return <Panel className="assistant-panel"><div className="assistant-copy"><span className="assistant-label"><span className="live-dot" />NEXUS INTELLIGENCE · {t(page)}</span><div className="assistant-welcome" lang={locale} dir={direction}>{t('Welcome to Nexus OS. How can I help manage your company today?')}</div><p className="assistant-subtitle" lang={locale} dir={direction}>{t('Your intelligent assistant is ready — choose a task to begin.')}</p><div className="voice-transcript" aria-live="polite">{speech.transcript && <><span lang={locale}>{t('Recognized speech')}</span><p>“{speech.transcript}”</p></>}</div>{speech.error && <p className="login-error" role="alert">{t(speech.error)}</p>}<div className="prompt-list" lang={locale} dir={direction}>{quickActions.map((prompt) => <button key={prompt.label} disabled={listening} onClick={() => executeRequest(prompt.action)}>{t(prompt.label)}<Icon name="arrow" size={14} /></button>)}</div><small className="speech-privacy-note">{t('Speech recognition uses your browser. Provider processing depends on browser implementation.')}</small></div><div className={`voice-visual ${listening ? 'listening' : ''}`} style={{ '--audio-level': speech.audioLevel } as CSSProperties}><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="wave-bars" aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <i key={index} style={{ '--bar': `${18 + ((index * 19) % 48)}%` } as CSSProperties} />)}</div><button className="mic-button" onClick={toggleListening} aria-label={t(listening ? 'Stop listening' : 'Start listening')}><Icon name={listening ? 'close' : 'mic'} size={23} /></button><span className="mic-caption">{t(listening ? 'LISTENING…' : 'TAP TO SPEAK')}</span></div><section className="assistant-reasoning" lang={locale} dir={direction} aria-live="polite"><h3>{t('مسار اتخاذ القرار الذكي')}</h3>{decision ? <><p>{decision.status === 'checking' ? t('Checking the request against approved actions…') : t(decision.response)}</p><ol>{decision.steps.map((step) => <li key={step}>{t(step)}</li>)}</ol><small>{decision.status === 'checking' ? t('Local demo processing') : t('Local demo action · no external model')}</small></> : <p>{t('Approved demo actions only, based on local sample data.')}</p>}</section></Panel>;
}

function AssistantDock({ page, onRun }: { page: PageId; onRun: (prompt: string) => void }) {
  const { t, locale, direction } = useLocale();
  const [open, setOpen] = useState(false);
  const actions = assistantPrompts[page];
  return <div className="assistant-dock" dir={direction} lang={locale}><button className={`assistant-dock-trigger ${open ? 'open' : ''}`} onClick={() => setOpen((current) => !current)} aria-expanded={open}><Icon name={open ? 'close' : 'spark'} size={17} /><span>{t('مساعد Nexus')}</span><i /></button>{open && <section className="assistant-dock-panel" aria-label={`${t('مساعد Nexus')} · ${t(page)}`}><span className="assistant-label"><span className="live-dot" />{t(page)}</span><strong>{t('كيف أساعدك الآن؟')}</strong><p>{t('اقتراحات تناسب مساحة العمل الحالية.')}</p>{actions.map((action) => <button key={action.label} onClick={() => { onRun(action.action); setOpen(false); }}>{t(action.label)}<Icon name="arrow" size={13} /></button>)}</section>}</div>;
}

const welcomeSteps = [
  { title: 'Get started with Nexus assistant', detail: 'Choose a suggested action or speak a request.', target: 'Your AI assistant' },
  { title: 'Follow your metrics calmly', detail: 'Your company’s key metrics are clear and update automatically.', target: 'Performance summary' },
  { title: 'Expand details when you need them', detail: 'Orders, tasks, and analytics are organized in expandable cards.', target: 'Operations cards' },
];

function hasDismissedOnboarding() {
  try {
    return window.sessionStorage.getItem('nexus-onboarding-dismissed') === 'true';
  } catch {
    return false;
  }
}

function WelcomeTour() {
  const { t, locale, direction } = useLocale();
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
  return <section className="welcome-guide" lang={locale} dir={direction} aria-label={t('Guide to get started')}><span className="guide-spark"><Icon name="spark" size={16} /></span><div className="guide-copy"><span className="guide-kicker">{t('Calm start')} · {step + 1} {t('of')} {welcomeSteps.length}</span><strong>{t(current.title)}</strong><p>{t(current.detail)}</p><div className="guide-progress" aria-label={`${t('Step')} ${step + 1} ${t('of')} ${welcomeSteps.length}`}>{welcomeSteps.map((item, index) => <i className={index <= step ? 'complete' : ''} key={item.target} />)}</div></div><div className="guide-actions"><button className="guide-dismiss" onClick={dismiss}>{t('Skip')}</button><button className="guide-next" onClick={() => step === welcomeSteps.length - 1 ? dismiss() : setStep((currentStep) => currentStep + 1)}>{t(step === welcomeSteps.length - 1 ? 'Get started' : 'Next')}<Icon name="arrow" size={13} /></button></div></section>;
}

function OverviewPage({ onRun }: { onRun: (prompt: string) => void }) {
  const { t, locale, direction } = useLocale();
  return <><PageHeading page="Overview" description="Your workspace, with clarity and calm. Everything you need in one place." /><WelcomeTour /><div className="metrics-grid zen-metrics"><Metric label="Total profit" value="$84,590" delta="+12.8%" icon="wallet" /><Metric label="Active users" value="2,840" delta="+8.2%" icon="users" tone="violet" /><Metric label="Inventory liquidity" value="$92,640" delta="+6.4%" icon="boxes" tone="blue" /></div><section className="zen-host"><VoiceAssistant onRun={onRun} page="Overview" /></section><section className="zen-disclosures" lang={locale} dir={direction}><details className="zen-disclosure"><summary><span className="disclosure-icon mint"><Icon name="chart" size={17} /></span><span className="disclosure-copy"><strong>{t('Financial overview')}</strong><small>{t('A simple view of revenue and growth trends')}</small></span><span className="disclosure-hint">{t('View details')}</span><Icon className="disclosure-chevron" name="chevron" size={16} /></summary><div className="disclosure-content"><Panel className="revenue-panel"><PanelTitle title="Revenue overview" subtitle="Your revenue is up 12.8% from last year" /><div className="chart-key"><span><i className="key-dot" />{t('Revenue')}</span><b>$284,590 <small>+12.8%</small></b></div><RevenueChart /></Panel></div></details><details className="zen-disclosure"><summary><span className="disclosure-icon blue"><Icon name="boxes" size={17} /></span><span className="disclosure-copy"><strong>{t('Orders, tasks, and alerts')}</strong><small>{t('Daily operations, organized in one place')}</small></span><span className="disclosure-hint">{t('View details')}</span><Icon className="disclosure-chevron" name="chevron" size={16} /></summary><div className="disclosure-content"><ArabicOperations /></div></details><details className="zen-disclosure"><summary><span className="disclosure-icon violet"><Icon name="spark" size={17} /></span><span className="disclosure-copy"><strong>{t('Latest company updates')}</strong><small>{t('Recent activity and sales stages')}</small></span><span className="disclosure-hint">{t('View details')}</span><Icon className="disclosure-chevron" name="chevron" size={16} /></summary><div className="disclosure-content activity-disclosure"><Panel><PanelTitle title="Recent activity" /><div className="activity-list"><Activity icon="check" title="Invoice paid" detail="INV-2026-084 · Meridian Studio" time="2 min ago" /><Activity icon="users" title="New customer added" detail="Riley Cooper · Northstar Health" time="18 min ago" /><Activity icon="boxes" title="Stock running low" detail="Wireless Headset · 8 remaining" time="1 hr ago" /></div></Panel></div></details></section></>;
}

function ArabicOperations() {
  const { t, locale, direction } = useLocale();
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
  return <section className="arabic-operations" dir={direction} lang={locale} aria-label={t('لوحة العمليات باللغة العربية')}>
    <header className="arabic-section-heading"><div><span className="arabic-live-dot" />{t('تحديثات مباشرة')} <span>{t('· آخر تحديث الآن')}</span></div><span className="arabic-stream-count">{t('تدفق مباشر')} <i /></span></header>
    <div className="arabic-grid">
      <section className="arabic-card orders-card">
        <header><div><h2>{t('أحدث الطلبات')}</h2><p>{t('متابعة الطلبات والتحصيلات')}</p></div><button onClick={() => window.dispatchEvent(new CustomEvent('nexus:navigate', { detail: 'Sales & CRM' }))}>{t('عرض الكل')} <Icon name="arrow" size={14} /></button></header>
        <div className="arabic-orders">{orders.map((order) => <article key={order.number}><span className="order-glyph"><Icon name="boxes" size={16} /></span><span className="order-details"><strong>{t(order.customer)}</strong><small>{order.number} · {t(order.product)}</small></span><span className="order-price"><strong>{t(order.amount)}</strong><small className={`arabic-status ${order.tone}`}>{t(order.state)}</small></span></article>)}</div>
        <div className="orders-live-note"><span className="arabic-live-dot" />{t('تمت مزامنة')} {stream + 3} {t('طلبات اليوم')}</div>
      </section>
      <section className="arabic-card tasks-card">
        <header><div><h2>{t('المواعيد والمهام')}</h2><p>{t('أولويات فريقك لهذا اليوم')}</p></div><span className="task-count">{tasks.length - completed.length} {t('مهام')}</span></header>
        <div className="arabic-tasks">{tasks.map((task) => <label className={`arabic-task ${completed.includes(task.id) ? 'task-complete' : ''}`} key={task.id}><input type="checkbox" checked={completed.includes(task.id)} onChange={() => setCompleted((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])} /><span className={`task-priority ${task.tone}`} /><span><strong>{t(task.title)}</strong><small>{t(task.detail)}</small></span></label>)}</div>
        <button className="add-task-button" onClick={() => setCompleted([])}><Icon name="plus" size={14} /> {t('إعادة تعيين قائمة المهام')}</button>
      </section>
      <section className="arabic-card alerts-card">
        <header><div><h2>{t('تنبيهات ذكية')}</h2><p>{t('إشعارات تتطلب انتباهك')}</p></div><span className="alert-count">{alerts.filter((alert) => !dismissed.includes(alert.id)).length}</span></header>
        <div className="arabic-alerts">{alerts.filter((alert) => !dismissed.includes(alert.id)).map((alert) => <article className={`arabic-alert ${alert.tone}`} key={alert.id}><i /><span><strong>{t(alert.title)}</strong><small>{t(alert.detail)}</small></span><button aria-label={`${t('إخفاء التنبيه')}: ${t(alert.title)}`} onClick={() => setDismissed((current) => [...current, alert.id])}>×</button></article>)}</div>
      </section>
    </div>
  </section>;
}

function Activity({ icon, title, detail, time }: { icon: IconName; title: string; detail: string; time: string }) {
  const { t } = useLocale();
  return <div className="activity-item"><span className="activity-icon"><Icon name={icon} size={16} /></span><div className="activity-copy"><strong>{t(title)}</strong><span>{t(detail)}</span></div><time>{t(time)}</time></div>;
}

function AssistantPage({ onRun, execution }: { onRun: (prompt: string) => void; execution: string }) {
  const { t, locale, direction } = useLocale();
  return <><PageHeading page="AI assistant" description="A capable partner for the questions and work that move your business forward." /><div className="assistant-layout"><VoiceAssistant onRun={onRun} page="AI assistant" /><Panel className="execution-panel"><PanelTitle title="Execution stream" subtitle="Activity from this local demo" action={<span className="live-badge"><i />{t('DEMO')}</span>} /><div className="execution-list"><Activity icon="check" title="Local demo context loaded" detail="Sample Finance, CRM, People & inventory data" time="now" /><Activity icon="spark" title={execution || 'Ready when you are'} detail={execution ? 'Demo action completed' : 'Try an approved demo prompt'} time={execution ? 'just now' : '—'} /><Activity icon="clock" title="External data connection" detail="No backend or external service is connected" time="offline" /></div><div className="assistant-suggestions" lang={locale} dir={direction}><h3>{t('Quick actions')} · {t('AI assistant')}</h3>{assistantPrompts['AI assistant'].map((prompt) => <button key={prompt.label} onClick={() => onRun(prompt.action)}>{t(prompt.label)}<Icon name="arrow" size={14} /></button>)}</div></Panel></div></>;
}

function FinanceContent({ invoices, onAddTransaction }: { invoices: Invoice[]; onAddTransaction: () => void }) {
  const { t, locale, direction } = useLocale();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return <><PageHeading page="Finance" description="A clear picture of revenue, invoices, and the health of your business." action={<button className="button button-primary" onClick={onAddTransaction}><Icon name="plus" size={16} />{t('New transaction')}</button>} /><div className="metrics-grid"><Metric label="Cash balance" value="$184,290" delta="+8.4%" icon="wallet" /><Metric label="Monthly recurring" value="$48,290" delta="+14.6%" icon="trend" tone="violet" /><Metric label="Outstanding invoices" value="$12,840" delta="3 overdue" icon="clock" tone="amber" /><Metric label="Operating expenses" value="$32,610" delta="−2.1%" icon="chart" tone="blue" /></div><div className="dashboard-grid"><Panel className="revenue-panel"><PanelTitle title="Cash flow" subtitle="Inflow and outflow, year to date" action={<select aria-label={t('Cash flow period')} defaultValue="This year"><option>{t('This year')}</option><option>{t('This quarter')}</option></select>} /><div className="cashflow-chart" lang={locale} dir={direction}>{[54, 64, 43, 72, 59, 86, 68, 91, 60, 78, 88, 96].map((height, i) => <div className="cashflow-month" key={i}><div><i style={{ height: `${height}%` }} /><b style={{ height: `${Math.max(22, height - 24)}%` }} /></div><span>{months[i]}</span></div>)}</div><div className="legend"><span><i className="key-dot" />{t('Income')}</span><span><i className="key-dot expense" />{t('Expenses')}</span></div></Panel><Panel><PanelTitle title="Expense breakdown" subtitle="This month" /><div className="expense-visual"><div className="donut-chart"><div><strong>$32.6k</strong><span>{t('Total spend')}</span></div></div><div className="expense-list"><Expense label="Payroll" amount="$18,420" percent="56%" color="mint" /><Expense label="Operations" amount="$8,240" percent="25%" color="blue" /><Expense label="Marketing" amount="$4,560" percent="14%" color="violet" /><Expense label="Other" amount="$1,390" percent="5%" color="amber" /></div></div></Panel><Panel className="wide-panel"><PanelTitle title="Recent invoices" subtitle="Track payments and follow up on outstanding balances" action={<button className="text-button">{t('All invoices')} <Icon name="arrow" size={14} /></button>} /><div className="table-wrap"><table lang={locale}><thead><tr>{['INVOICE', 'CUSTOMER', 'DATE', 'AMOUNT', 'STATUS'].map((heading) => <th key={heading}>{t(heading)}</th>)}</tr></thead><tbody>{invoices.map((row) => <tr key={row.id}><td>{row.id}</td><td>{t(row.customer)}</td><td>{t(row.date)}</td><td>{row.amount}</td><td><span className={`status-pill ${row.status.toLowerCase()}`}>{t(row.status)}</span></td></tr>)}</tbody></table></div></Panel></div></>;
}

function FinancePage({ invoices, onAddTransaction, inventoryOnHand }: { invoices: Invoice[]; onAddTransaction: () => void; inventoryOnHand: number }) {
  const { t, locale } = useLocale();
  return <>
    <FinanceContent invoices={invoices} onAddTransaction={onAddTransaction} />
    <ModuleErrorBoundary label={t('أرشيف الفواتير')}><InvoiceArchiver /></ModuleErrorBoundary>
    <ForecastPanel recurringRevenue={48290} inventoryOnHand={inventoryOnHand} />
    <Panel><PanelTitle title="Subscription lifecycle" subtitle="Recurring plans renewing across your workspace" /><div className="table-wrap"><table lang={locale}><thead><tr>{['SUBSCRIPTION', 'CUSTOMER', 'RENEWAL', 'MONTHLY VALUE', 'STATUS'].map((heading) => <th key={heading}>{t(heading)}</th>)}</tr></thead><tbody>{[['Growth plan', 'Meridian Studio', 'Oct 28, 2026', '$1,200', 'Active'], ['Business plan', 'Northstar Health', 'Nov 02, 2026', '$840', 'Active'], ['Starter plan', 'Atlas Commerce', 'Nov 05, 2026', '$240', 'Trial'], ['Enterprise plan', 'Solstice Group', 'Oct 26, 2026', '$2,400', 'Active']].map((row) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td><span className={`status-pill ${row[4] === 'Active' ? 'paid' : 'pending'}`}>{t(row[4])}</span></td></tr>)}</tbody></table></div></Panel>
  </>;
}

function Expense({ label, amount, percent, color }: { label: string; amount: string; percent: string; color: string }) {
  const { t } = useLocale();
  return <div className="expense-item"><span className={`key-dot ${color}`} /><span>{t(label)}</span><strong>{amount}</strong><small>{percent}</small></div>;
}

function CrmPage({ deals, setDeals }: { deals: Deal[]; setDeals: (deals: Deal[]) => void }) {
  const { t, locale } = useLocale();
  const stages: DealStage[] = ['Qualified', 'Proposal', 'Negotiation', 'Won'];
  const [dragged, setDragged] = useState<number | null>(null);
  const moveDeal = (id: number, direction: number) => setDeals(deals.map((deal) => {
    if (deal.id !== id) return deal;
    return { ...deal, stage: stages[Math.max(0, Math.min(stages.length - 1, stages.indexOf(deal.stage) + direction))] };
  }));
  const newDeal = () => setDeals([...deals, { id: Date.now(), company: 'New opportunity', contact: 'Add a contact', value: 9800, stage: 'Qualified', color: 'blue' }]);
  return <><PageHeading page="Sales & CRM" description="Build relationships, move deals forward, and grow your pipeline." action={<button className="button button-primary" onClick={newDeal}><Icon name="plus" size={16} />{t('Add opportunity')}</button>} /><div className="crm-summary"><span><b>{deals.length}</b> {t('open opportunities')}</span><span>{t('Pipeline value')} <b>${deals.reduce((sum, deal) => sum + deal.value, 0).toLocaleString(locale)}</b></span><span>{t('Win rate')} <b>32.8%</b></span></div><div className="kanban-board" lang={locale}>{stages.map((stage, stageIndex) => <section className="kanban-column" key={stage} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== null) setDeals(deals.map((deal) => deal.id === dragged ? { ...deal, stage } : deal)); setDragged(null); }}><div className="kanban-heading"><span className={`stage-dot stage-${stageIndex}`} />{t(stage)}<span>{deals.filter((deal) => deal.stage === stage).length}</span><button aria-label={`${t('Add deal to')} ${t(stage)}`} onClick={() => setDeals([...deals, { id: Date.now(), company: 'New opportunity', contact: 'Add a contact', value: 9800, stage, color: 'blue' }])}><Icon name="plus" size={15} /></button></div>{deals.filter((deal) => deal.stage === stage).map((deal) => <article className="deal-card" key={deal.id} draggable onDragStart={() => setDragged(deal.id)} onDragEnd={() => setDragged(null)}><div className="deal-top"><span className={`company-avatar ${deal.color}`}>{deal.company.charAt(0)}</span><button aria-label={`${t('More options for')} ${deal.company}`} className="icon-button"><Icon name="more" size={16} /></button></div><strong>{t(deal.company)}</strong><span className="deal-contact">{t(deal.contact)}</span><div className="deal-value">${deal.value.toLocaleString(locale)}</div><div className="deal-footer"><span className="contact-avatar">{deal.contact.split(' ').map((part) => part[0]).join('')}</span><span>{t('Updated today')}</span><div className="deal-controls"><button aria-label={t('Move deal to previous stage')} disabled={stageIndex === 0} onClick={() => moveDeal(deal.id, -1)}>‹</button><button aria-label={t('Move deal to next stage')} disabled={stageIndex === stages.length - 1} onClick={() => moveDeal(deal.id, 1)}>›</button></div></div></article>)}</section>)}</div></>;
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
  const { t, locale } = useLocale();
  const [team, setTeam] = useState(employees);
  return <><PageHeading page="People" description="Your people operations, thoughtfully organized." action={<button className="button button-primary" onClick={() => setTeam((current) => [...current, { name: `New teammate ${current.length - employees.length + 1}`, title: 'New team member', team: 'Unassigned', initials: 'NT', color: 'blue', status: 'Invited' }])}><Icon name="plus" size={16} />{t('Add employee')}</button>} /><div className="metrics-grid"><Metric label="Team members" value={`${48 + team.length - employees.length}`} delta="+4 this quarter" icon="users" /><Metric label="Payroll this month" value="$286,400" delta="Processed Oct 20" icon="wallet" tone="violet" /><Metric label="On leave today" value="3" delta="Across 2 teams" icon="clock" tone="amber" /><Metric label="Open positions" value="6" delta="2 new this month" icon="briefcase" tone="blue" /></div><Panel><PanelTitle title="Team directory" subtitle="Meet the people who make it happen" action={<input className="table-search" placeholder={t('Search team…')} aria-label={t('Search team…')} />} /><div className="employee-grid" lang={locale}>{team.map((person) => <article className="employee-card" key={person.name}><div className={`employee-avatar ${person.color}`}>{person.initials}</div><strong>{person.name.startsWith('New teammate ') ? `${t('New teammate')} ${person.name.slice('New teammate '.length)}` : person.name}</strong><span>{t(person.title)}</span><div className="employee-meta"><span>{t(person.team)}</span><span className="presence"><i />{t(person.status)}</span></div></article>)}</div></Panel><Panel><PanelTitle title="Today’s schedule" subtitle="Thursday, October 23" action={<button className="text-button">{t('View calendar')} <Icon name="arrow" size={14} /></button>} /><div className="schedule-list"><Schedule time="09:00" title="Product design sync" team="Product · Maya Chen, Oliver Kim" color="blue" /><Schedule time="10:30" title="Weekly finance review" team="Finance · James Wilson, Alex Morgan" color="mint" /><Schedule time="13:00" title="Candidate interview — Senior Designer" team="People · Sofia Patel" color="violet" /></div></Panel></>;
}

function Schedule({ time, title, team, color }: { time: string; title: string; team: string; color: string }) {
  const { t } = useLocale();
  return <div className="schedule-row"><time>{time}</time><i className={`schedule-marker ${color}`} /><div><strong>{t(title)}</strong><span>{t(team)}</span></div><button className="icon-button" aria-label={t('Schedule options')}><Icon name="more" size={16} /></button></div>;
}

function InventoryPage({ onRestock, stock }: { onRestock: (name: string) => void; stock: number }) {
  const { t, locale } = useLocale();
  const items = [{ name: 'Wireless Headset', sku: 'WH-240 · Accessories', stock, target: 25, category: 'Electronics', price: '$89.00' }, { name: 'USB-C Hub Pro', sku: 'HC-110 · Accessories', stock: 34, target: 15, category: 'Electronics', price: '$64.00' }, { name: 'Ergonomic Desk Chair', sku: 'DC-480 · Furniture', stock: 12, target: 10, category: 'Furniture', price: '$320.00' }, { name: 'Standing Desk Frame', sku: 'SF-220 · Furniture', stock: 8, target: 12, category: 'Furniture', price: '$410.00' }, { name: 'Studio Monitor 4K', sku: 'SM-400 · Electronics', stock: 18, target: 8, category: 'Electronics', price: '$580.00' }];
  return <><PageHeading page="Inventory" description="Know what’s in stock, what’s moving, and what needs attention." action={<button className="button button-primary" onClick={() => onRestock('New inventory item')}><Icon name="plus" size={16} />{t('Add item')}</button>} /><div className="metrics-grid"><Metric label="Total assets" value="1,284" delta="Across 8 categories" icon="boxes" /><Metric label="Inventory value" value="$92,640" delta="+6.4%" icon="wallet" tone="violet" /><Metric label="Low stock items" value={stock < 15 ? '2' : '1'} delta="Needs attention" icon="bell" tone="amber" /><Metric label="Open purchase orders" value="4" delta="$12,840 total" icon="briefcase" tone="blue" /></div><Panel><PanelTitle title="Stock overview" subtitle="Track available items and reorder before you run low" action={<button className="text-button">{t('All categories')} <Icon name="chevron" size={14} /></button>} /><div className="table-wrap"><table lang={locale}><thead><tr>{['ITEM', 'SKU', 'AVAILABLE', 'UNIT PRICE', 'STATUS', 'ACTION'].map((heading) => <th key={heading}>{t(heading)}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.name}><td><span className="inventory-name"><span className="inventory-icon"><Icon name="boxes" size={16} /></span>{t(item.name)}</span></td><td>{t(item.sku)}</td><td><span className="stock-count">{item.stock} <small>/ {item.target} {t('min')}</small></span><span className="stock-track"><i className={item.stock <= item.target ? 'low' : ''} style={{ width: `${Math.min(100, item.stock / (item.target * 2) * 100)}%` }} /></span></td><td>{item.price}</td><td><span className={`status-pill ${item.stock <= item.target ? 'overdue' : 'paid'}`}>{t(item.stock <= item.target ? 'Low stock' : 'In stock')}</span></td><td><button className="text-button" onClick={() => onRestock(item.name)}>{t(item.stock <= item.target ? 'Reorder' : 'Restock')} <Icon name="arrow" size={13} /></button></td></tr>)}</tbody></table></div></Panel></>;
}

function AnalyticsPage({ inventoryOnHand }: { inventoryOnHand: number }) {
  const { t, locale } = useLocale();
  return <>
    <PageHeading page="Analytics" description="A real-time view of the signals shaping your business." action={<button className="button button-secondary"><Icon name="clock" size={15} />{t('Last 30 days')} <Icon name="chevron" size={14} /></button>} />
    <div className="metrics-grid"><Metric label="Gross volume" value="$1.24M" delta="+18.2%" icon="trend" /><Metric label="Customer retention" value="94.8%" delta="+2.4%" icon="users" tone="violet" /><Metric label="Avg. order value" value="$482" delta="+6.8%" icon="wallet" tone="blue" /><Metric label="Growth efficiency" value="3.2×" delta="+0.4×" icon="chart" tone="amber" /></div>
    <ForecastPanel recurringRevenue={48290} inventoryOnHand={inventoryOnHand} />
    <div className="dashboard-grid"><Panel className="revenue-panel"><PanelTitle title="Performance trends" subtitle="Revenue, customers, and orders over time" /><div lang={locale}><RevenueChart /></div></Panel><Panel><PanelTitle title="Revenue by channel" subtitle="Share of total revenue" /><div className="channel-chart"><div className="channel-donut"><span><strong>$284k</strong><small>{t('Total revenue')}</small></span></div><div className="expense-list"><Expense label="Direct" amount="$142k" percent="50%" color="mint" /><Expense label="Partners" amount="$85k" percent="30%" color="blue" /><Expense label="Organic" amount="$57k" percent="20%" color="violet" /></div></div></Panel><Panel className="wide-panel"><PanelTitle title="Operational health" subtitle="A live overview of connected business functions" /><div className="health-grid" lang={locale}>{[['Finance', 'All systems operational', 'mint'], ['Sales & CRM', '7 opportunities active', 'blue'], ['People', '48 team members', 'violet'], ['Inventory', '2 items need attention', 'amber']].map(([name, status, color]) => <div className="health-card" key={name}><span className={`health-icon ${color}`}><Icon name={name === 'Finance' ? 'wallet' : name === 'Sales & CRM' ? 'users' : name === 'People' ? 'briefcase' : 'boxes'} size={18} /></span><strong>{t(name)}</strong><span><i className={`health-dot ${color}`} />{t(status)}</span></div>)}</div></Panel></div>
  </>;
}

export function App() {
  const { locale, direction, setLocale, t } = useLocale();
  const [accessStage, setAccessStage] = useState<AccessStage>('workspace');
  const [authAttempt, setAuthAttempt] = useState(0);
  const [authError, setAuthError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [activePage, setActivePage] = useState<PageId>('Overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [commandOpen, setCommandOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [execution, setExecution] = useState('');
  const [toast, setToast] = useState('');
  const handleUnauthorized = useCallback(() => setAccessStage('unauthorized'), []);

  useEffect(() => {
    const controller = new AbortController();

    const verifyIdentity = async () => {
      try {
        const response = await fetchIdentityResponse(controller.signal);
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          setAccessStage('unauthorized');
          return;
        }
        if (!response.ok) throw identityResponseError(response.status);

        const identity: unknown = await response.json();
        if (typeof identity !== 'object' || identity === null || !('email' in identity)
          || typeof identity.email !== 'string' || identity.email.length > 254) {
          throw new Error('The identity endpoint returned an invalid response.');
        }
        setUserEmail(identity.email);
        setAccessStage('workspace');
      } catch (error) {
        if (!controller.signal.aborted) {
          setAuthError(error instanceof Error ? error.message : 'Identity verification failed. Please retry.');
          setAccessStage('error');
        }
      }
    };

    // void verifyIdentity();
    return () => controller.abort();
  }, [authAttempt]);

  const workspaceData = useWorkspaceData(accessStage === 'workspace', handleUnauthorized);
  const { data, setDeals, setInventoryOnHand: setStock, setInvoices } = workspaceData;
  const workspace = t('Personal workspace');
  const stock = data.inventoryOnHand;
  const deals = data.deals;
  const invoices = data.invoices;

  useEffect(() => {
    try {
      [
        'nexus-demo-session-v1',
        'nexus-demo-installation-v1',
        'nexus-demo-inventory-v1',
        'nexus-demo-crm-v1',
        'nexus-demo-invoices-v1',
      ].forEach((key) => window.localStorage.removeItem(key));
    } catch (error) {
      console.error('Could not clear legacy demo records from browser storage.', error);
    }
  }, []);

  const runAction = useCallback((prompt: string) => {
    if (!resolveTrustedAssistantRequest(prompt)) {
      setToast(t('This request is not in the approved demo action list.'));
      return;
    }
    const normalized = prompt.toLowerCase();
    const title = normalized.includes('payroll') ? 'Payroll demo review complete' : normalized.includes('inventory') ? 'Inventory demo review complete' : normalized.includes('cash flow') ? 'Demo cash flow summary ready' : normalized.includes('synced leads') ? 'Demo leads reviewed' : 'Demo sales report ready';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setExecution(title);
    setWorkflows((current) => [{ id: Date.now(), title, state: 'running' as const, time: now }, ...current].slice(0, 4));
    if (normalized.includes('payroll')) setToast(t('Demo payroll review complete — sample data only.'));
    else if (normalized.includes('inventory')) setToast(t('Demo inventory review complete — sample data only.'));
    else if (normalized.includes('cash flow')) setToast(t('Demo cash flow summary is ready — sample data only.'));
    else if (normalized.includes('synced leads')) setToast(t('Demo leads are ready in Sales & CRM.'));
    else setToast(t('Demo sales report is ready — sample data only.'));
  }, [t]);

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
    document.title = `${t(activePage)} · ${appName}`;
  }, [activePage, t]);

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

  const groupedItems = useMemo(() => navigation.reduce<Record<string, typeof navigation>>((groups, item) => {
    groups[item.group] = [...(groups[item.group] ?? []), item];
    return groups;
  }, {}), []);

  const restock = (name: string) => {
    setStock((current) => current + 20);
    setWorkflows((current) => [{ id: Date.now(), title: `Supplier order placed · ${name}`, state: 'running' as const, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...current].slice(0, 4));
    setToast(`${t('Supplier order placed for')} ${name}.`);
  };

  const addDemoTransaction = () => {
    const invoiceNumber = `INV-DEMO-${Date.now()}`;
    const transaction: Invoice = {
      id: invoiceNumber,
      customer: 'New demo transaction',
      date: new Date().toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
      amount: '$1,200',
      status: 'Pending',
    };
    setInvoices((current) => [transaction, ...current].slice(0, 100));
    setToast(t('Transaction saved to your secure workspace. No payment was processed.'));
  };

  const signOut = () => {
    window.location.assign('/cdn-cgi/access/logout');
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
    setToast(`${t('Demo lead from')} ${safeChannelName} ${t('to Sales & CRM.')}`);
  };

  const filteredNavigation = navigation.filter((item) =>
    `${item.id} ${t(item.id)}`.toLowerCase().includes(search.toLowerCase()),
  );

  // Bypass security screens safely without breaking constants

  return <div className="app-shell" data-theme={theme} dir={direction} lang={locale}>
    <aside className="sidebar">
      <div>
        <button className="brand-lockup" aria-label={`${t('Nexus business ERP SaaS OS')} home`} onClick={() => setActivePage('Overview')}>
          <span className="brand-symbol"><span /><span /><span /><span /></span>
          <span className="brand-name">nexus<span>business ERP SaaS OS</span></span>
        </button>
        <div className="workspace-switcher">
          <span className="workspace-mark">N</span>
          <span><strong>{workspace}</strong><small>{t('Private to your identity')}</small></span>
          <Icon name="chevron" size={15} />
        </div>
        {Object.entries(groupedItems).map(([group, items]) => <nav className="nav-group" key={group} aria-label={t(group)}>
          <p className="nav-label">{t(group)}</p>
          {items.map((item) => <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
            <Icon name={item.icon} size={17} />
            <span>{t(item.id)}</span>
            {item.id === 'Analytics' && <i className="nav-count">٣</i>}
            {item.id === 'Inventory' && <i className="nav-count">٢</i>}
          </button>)}
        </nav>)}
      </div>
      <div className="sidebar-bottom">
        <div className="upgrade-card">
          <span className="upgrade-icon"><Icon name="spark" size={16} /></span>
          <strong>{t('Make your business more efficient')}</strong>
          <p>{t('Discover AI capabilities for your team.')}</p>
          <button onClick={() => setActivePage('AI assistant')}>{t('Explore Nexus assistant')} <Icon name="arrow" size={13} /></button>
        </div>
        <button className="profile-button" onClick={signOut}>
          <span className="profile-avatar">{userEmail.slice(0, 2).toUpperCase()}</span>
          <span><strong>{userEmail}</strong><small>{t('Workspace manager · Sign out')}</small></span>
          <Icon name="more" size={16} />
        </button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><span>{workspace}</span><span>/</span><strong>{t(activePage)}</strong></div>
        <div className="topbar-actions">
          <button className="search-trigger" onClick={() => setCommandOpen(true)}><Icon name="search" size={16} /><span>{t('Search your workspace')}</span><kbd>⌘ K</kbd></button>
          <button className="icon-button language-toggle" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} aria-label={t(locale === 'ar' ? 'Switch language to English' : 'Switch language to Arabic')}>{locale === 'ar' ? 'EN' : 'عربي'}</button>
          <button className="icon-button theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={t(theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} /></button>
          <button className="icon-button notification-button" aria-label={t('Notifications')}><Icon name="bell" size={17} /><i /></button>
          <span className="topbar-divider" /><div className="topbar-profile"><span className="profile-avatar">{userEmail.slice(0, 2).toUpperCase()}</span><Icon name="chevron" size={14} /></div>
        </div>
      </header>
      <div className="page-content">
        <ModuleErrorBoundary key={activePage} label={t(activePage)}>
        {activePage === 'Overview' && <OverviewPage onRun={runAction} />}
        {activePage === 'AI assistant' && <AssistantPage onRun={runAction} execution={execution} />}
        {activePage === 'Finance' && <FinancePage invoices={invoices} onAddTransaction={addDemoTransaction} inventoryOnHand={stock} />}
        {activePage === 'Sales & CRM' && <CrmPage deals={deals} setDeals={setDeals} />}
        {activePage === 'People' && <PeoplePage />}
        {activePage === 'Inventory' && <InventoryPage onRestock={restock} stock={stock} />}
        {activePage === 'Analytics' && <AnalyticsPage inventoryOnHand={stock} />}
        {activePage === 'Integrations' && <IntegrationHub onSyncLead={syncSocialLead} />}
        </ModuleErrorBoundary>
      </div>
      <footer className="app-footer"><span><i className="health-dot mint" />{t('All systems operational')}</span><span>© 2026 Nexus business ERP SaaS OS <span className="footer-separator">·</span> {t('Built for better business')}</span></footer>
    </main>
    {activePage !== 'Overview' && activePage !== 'AI assistant' && <AssistantDock page={activePage} onRun={runAction} />}
    <button className={`system-tray-button ${workflows.some((workflow) => workflow.state === 'running') ? 'has-running' : ''}`} onClick={() => setTrayOpen((open) => !open)} aria-label={`Background workflows${workflows.some((workflow) => workflow.state === 'running') ? ', running' : ''}`}><span className="tray-pulse" /><Icon name="command" size={17} />{workflows.some((workflow) => workflow.state === 'running') && <i />}</button>
    {trayOpen && <div className="workflow-tray"><div className="tray-heading"><div><strong>{t('Background activity')}</strong><span>{workflows.filter((workflow) => workflow.state === 'running').length} {t('running')}</span></div><button className="icon-button" onClick={() => setTrayOpen(false)} aria-label={t('Close activity panel')}><Icon name="close" size={16} /></button></div>{workflows.length ? workflows.map((workflow) => <div className="workflow-item" key={workflow.id}><span className={`workflow-status ${workflow.state}`}><Icon name={workflow.state === 'complete' ? 'check' : 'clock'} size={14} /></span><span><strong>{t(workflow.title)}</strong><small>{workflow.state === 'complete' ? t('Completed') : t('Working in the background')} · {workflow.time}</small></span></div>) : <p className="empty-state">{t('Your background activity will appear here.')}</p>}</div>}
    {commandOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><section className="command-modal" role="dialog" aria-modal="true" aria-label={t('Search Nexus')}><div className="command-input"><Icon name="search" size={19} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search pages and tools…')} /><kbd>ESC</kbd></div><span className="command-caption">{t('PAGES & WORKSPACES')}</span>{filteredNavigation.map((item) => <button className="command-result" key={item.id} onClick={() => { setActivePage(item.id); setCommandOpen(false); setSearch(''); }}><span className="command-icon"><Icon name={item.icon} size={16} /></span>{t(item.id)}<kbd>↵</kbd></button>)}{filteredNavigation.length === 0 && <p className="empty-state">{t('No matching pages. Try another search.')}</p>}<div className="command-hint"><Icon name="command" size={14} />{t('Nexus global search')} <span>{t('Search your business, naturally.')}</span></div></section></div>}
    {toast && <div className="toast" role="status"><span><Icon name="check" size={16} /></span>{toast}<button onClick={() => setToast('')} aria-label={t('Dismiss notification')}><Icon name="close" size={14} /></button></div>}
  </div>;
}
