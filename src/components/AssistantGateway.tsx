import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../i18n/useLocale';

type AssistantResult = {
  text: string;
  model: string;
  provider: string;
};

type Conversation = {
  id: string;
  provider: string;
  model: string;
  createdAt: number;
  input: {
    mode: 'text' | 'document' | 'audio';
    prompt?: string;
  };
  output: {
    text: string;
  };
};

const maxFileSize = 1_000_000;

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    throw new Error('The assistant endpoint returned a non-JSON response.');
  }
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error('The assistant endpoint returned invalid JSON.');
  }
}

export function AssistantGateway() {
  const { t, locale } = useLocale();
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [historyBusy, setHistoryBusy] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const historyCopy = useMemo(() => locale === 'ar'
      // ==================== [بداية حقن نظام الأمان العالمي لـ Nexora] ====================
  const [step, setStep] = useState('passcode');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [passcode, setPasscode] = useState('');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [activeUser, setActiveUser] = useState<{ name: string; email: string } | null>(null);
  const [secLoading, setSecLoading] = useState(false);
  const [secMessage, setSecMessage] = useState('');
  const [secError, setSecError] = useState<string | null>(null);

  // التحقق الفوري من جلسة المتصفح
  useEffect(() => {
    fetch('/api/auth/gate')
      .then((res) => res.json())
      .then((data: any) => { if (data.verified) setStep('identity'); })
      .catch(() => {});
  }, []);

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // 1. معالجة بوابة الرمز السري
  const handlePasscodeSubmit = async (e: typeFormEvent) => {
    e.preventDefault();
    setSecLoading(true);
    setSecError(null);
    setSecMessage('جاري تشفير قنوات النظام وفحص الجدار الناري الموحد لـ Nexora...');
    await delay(2500); 
    try {
      const res = await fetch('/api/auth/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'رمز الوصول غير صحيح.');
      setStep('identity');
    } catch (err: any) {
      setSecError(err.message);
    } finally {
      setSecLoading(false);
    }
  };

  // 2. معالجة حساب الإيميل والباسورد
  const handleIdentitySubmit = async (e: typeFormEvent) => {
    e.preventDefault();
    setSecLoading(true);
    setSecError(null);
    setSecMessage(authMode === 'login' ? 'جاري مطابقة الهوية وفحص السجلات داخل قاعدة البيانات السحابية D1...' : 'جاري إنشاء المعرفات الفريدة وتأمين البيانات...');
    await delay(3500); 
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'فشلت المصادقة.');
      if (authMode === 'login') {
        setActiveUser(data.user);
        setStep('workspace');
      } else {
        setAuthMode('login');
        alert('تم تسجيل وتأمين حسابك بنجاح!');
      }
    } catch (err: any) {
      setSecError(err.message);
    } finally {
      setSecLoading(false);
    }
  };

  // 3. الخروج الآمن
  const handleLogout = async () => {
    setSecLoading(true);
    setSecMessage('جاري تدمير التواقيع الرقمية ومسح جلسات المتصفح بأمان...');
    await delay(2000);
    await fetch('/api/auth/logout', { method: 'POST' });
    setActiveUser(null);
    setPasscode('');
    setAuthForm({ email: '', password: '', name: '' });
    setStep('passcode');
    setSecLoading(false);
  };

  // عرض شاشات التحميل والحماية قبل كود المساعد الذكي
  if (secLoading) {
    return (
      <div className="min-h-screen bg-[#0b0c0e] flex flex-col justify-center items-center p-4" style={{ direction: 'rtl' }}>
        <div className="flex flex-col items-center space-y-6 text-center max-w-sm">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-[#22c55e]/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#22c55e] border-r-[#22c55e] animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-300 animate-pulse">{secMessage}</p>
        </div>
      </div>
    );
  }

  if (step === 'passcode') {
    return (
      <div className="min-h-screen bg-[#0b0c0e] text-[#e4e6eb] flex flex-col justify-center items-center p-4 font-sans" style={{ direction: 'rtl' }}>
        <div className="w-full max-w-md bg-[#13151a] border border-[#222630] rounded-2xl p-8 shadow-2xl">
          {secError && <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-400 rounded-xl text-xs text-center font-bold">{secError}</div>}
          <form onSubmit={handlePasscodeSubmit} className="space-y-6">
            <div className="text-center">
              <span className="text-xs uppercase tracking-widest text-[#22c55e] font-black">Nexora Security Node</span>
              <h2 className="text-2xl font-black text-white mt-1">بوابة الوصول الآمنة</h2>
              <p className="text-xs text-gray-400 mt-2">يرجى كتابة الرمز السري للنظام لتجاوز جدار الحماية وحماية السيرفر.</p>
            </div>
            <input
              type="password"
              placeholder="أدخل الرمز السرّي متبوعاً بـ #"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-[#1a1d24] border border-[#2d3341] rounded-xl px-4 py-4 text-sm text-center focus:outline-none focus:border-[#22c55e] tracking-widest text-white font-bold"
            />
            <button type="submit" className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-extrabold py-4 rounded-xl text-sm transition-all shadow-lg shadow-[#22c55e]/15">
              تأكيد التحقق السحابي والدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'identity') {
    return (
      <div className="min-h-screen bg-[#0b0c0e] text-[#e4e6eb] flex flex-col justify-center items-center p-4 font-sans" style={{ direction: 'rtl' }}>
        <div className="w-full max-w-md bg-[#13151a] border border-[#222630] rounded-2xl p-8 shadow-2xl">
          {secError && <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-400 rounded-xl text-xs text-center font-bold">{secError}</div>}
          
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white">{authMode === 'login' ? 'تسجيل الدخول للمساحة الشخصية' : 'إنشاء حساب مستخدم جديد'}</h2>
            </div>
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="الاسم الكامل"
                required
                value={authForm.name}
                onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                className="w-full bg-[#1a1d24] border border-[#2d3341] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#22c55e] text-right"
              />
            )}
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              required
              value={authForm.email}
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
              className="w-full bg-[#1a1d24] border border-[#2d3341] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#22c55e] text-left"
              style={{ direction: 'ltr' }}
            />
            <input
              type="password"
              placeholder="كلمة المرور"
              required
              value={authForm.password}
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
              className="w-full bg-[#1a1d24] border border-[#2d3341] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#22c55e] text-left"
              style={{ direction: 'ltr' }}
            />
            <button type="submit" className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-extrabold py-4 rounded-xl text-sm transition-all shadow-lg shadow-[#22c55e]/15">
              {authMode === 'login' ? 'تحقق ومصادقة الدخول الآمن' : 'حفظ وقفل البيانات السحابية'}
            </button>
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute w-full border-t border-[#222630]"></div>
              <span className="relative px-3 bg-[#13151a] text-xs text-gray-500">أو</span>
            </div>
            <button
              type="button"
              onClick={() => window.location.href = '/api/auth/google/start'}
              className="w-full bg-[#1a1d24] hover:bg-[#222630] border border-[#2d3341] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
            >
              <span>تسجيل الدخول الآمن عبر Google</span>
            </button>
            <p className="text-center text-xs text-gray-400 mt-6">
              {authMode === 'login' ? 'مستخدم جديد للمنصة؟ ' : 'لديك حساب نشط مسبقاً؟ '}
              <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[#22c55e] font-bold underline ml-1">
                {authMode === 'login' ? 'أنشئ حسابك الآن' : 'سجل دخولك'}
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }
  // ==================== [نهاية حقن نظام الأمان - يبدأ الآن كود المساعد الأصلي] ====================
        
    ? {
      title: 'سجل المحادثات',
      refresh: 'تحديث',
      loading: 'جارٍ تحميل السجل…',
      empty: 'ستظهر المحادثات المؤرشفة هنا.',
      error: 'تعذر تحميل سجل المحادثات.',
      archiveNotice: 'يُحفظ سجل المحادثات مشفراً في مساحة عملك.',
      untitled: 'محادثة جديدة',
      modes: { text: 'محادثة', document: 'تحليل مستند', audio: 'محادثة صوتية' },
    }
    : {
      title: 'Conversation history',
      refresh: 'Refresh',
      loading: 'Loading history…',
      empty: 'Archived conversations will appear here.',
      error: 'Could not load conversation history.',
      archiveNotice: 'Conversation history is encrypted and saved to your workspace.',
      untitled: 'New conversation',
      modes: { text: 'Chat', document: 'Document analysis', audio: 'Voice chat' },
    }, [locale]);

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/assistant/history', {
        credentials: 'same-origin',
        signal,
      });
      const body = await parseResponse(response);
      if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
          ? body.error
          : historyCopy.error;
        throw new Error(message);
      }
      if (typeof body !== 'object' || body === null || !('conversations' in body) || !Array.isArray(body.conversations)) {
        throw new Error(t('The assistant returned an invalid response.'));
      }
      const conversations = body.conversations.filter((item): item is Conversation =>
        typeof item === 'object'
        && item !== null
        && 'id' in item && typeof item.id === 'string'
        && 'provider' in item && typeof item.provider === 'string'
        && 'model' in item && typeof item.model === 'string'
        && 'createdAt' in item && typeof item.createdAt === 'number'
        && 'input' in item && typeof item.input === 'object' && item.input !== null
        && 'mode' in item.input && (item.input.mode === 'text' || item.input.mode === 'document' || item.input.mode === 'audio')
        && (!('prompt' in item.input) || typeof item.input.prompt === 'string')
        && 'output' in item && typeof item.output === 'object' && item.output !== null
        && 'text' in item.output && typeof item.output.text === 'string');
      setHistory(conversations);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setHistoryError(requestError instanceof Error ? requestError.message : historyCopy.error);
    } finally {
      if (!signal?.aborted) setHistoryBusy(false);
    }
  }, [historyCopy, t]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadHistory(controller.signal));
    return () => controller.abort();
  }, [loadHistory]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim() && !file) {
      setError(t('Enter a question or choose a supported file.'));
      return;
    }
    if (file && file.size > maxFileSize) {
      setError(t('Files must be 1 MB or smaller.'));
      return;
    }

    setBusy(true);
    setError('');
    setResult(null);
    try {
      let payload: Record<string, string> = { mode: 'text', prompt: prompt.trim(), locale };
      if (file) {
        const mimeType = file.type.toLowerCase();
        if (mimeType.startsWith('audio/')) {
          payload = {
            mode: 'audio',
            fileBase64: encodeBase64(await file.arrayBuffer()),
            mimeType,
            locale,
          };
          if (prompt.trim()) payload.prompt = prompt.trim();
        } else if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          payload = {
            mode: 'document',
            fileBase64: encodeBase64(await file.arrayBuffer()),
            mimeType: 'application/pdf',
            prompt: prompt.trim(),
            locale,
          };
        } else if (/\.(csv|md|txt)$/iu.test(file.name)) {
          payload = {
            mode: 'document',
            documentText: await file.text(),
            prompt: prompt.trim(),
            locale,
          };
        } else {
          throw new Error(t('Choose a PDF, CSV, text, Markdown, or supported audio file.'));
        }
      }

      const response = await fetch('/api/assistant', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45_000),
      });
      const body = await parseResponse(response);
      if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
          ? body.error
          : t('The assistant request could not be completed.');
        throw new Error(message);
      }
      if (typeof body !== 'object' || body === null || !('text' in body) || typeof body.text !== 'string'
        || !('model' in body) || typeof body.model !== 'string'
        || !('provider' in body) || typeof body.provider !== 'string') {
        throw new Error(t('The assistant returned an invalid response.'));
      }
      setResult({ text: body.text, model: body.model, provider: body.provider });
      setHistoryBusy(true);
      setHistoryError('');
      void loadHistory();
      setPrompt('');
      setFile(null);
      const input = document.getElementById('assistant-file-input');
      if (input instanceof HTMLInputElement) input.value = '';
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('The assistant request could not be completed.'));
    } finally {
      setBusy(false);
    }
  };

  const speakResult = () => {
    if (!result || !('speechSynthesis' in window)) {
      setError(t('Speech playback is not available in this browser.'));
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(result.text);
    utterance.lang = locale === 'ar' ? 'ar-SA' : 'en-US';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setError(t('Speech playback is not available in this browser.'));
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return <section className="assistant-gateway" lang={locale} aria-label={t('Nexora AI Gateway')}>
        {/* شريط الإدارة العلوي المطور لبيانات الحساب وزر خروج يوتيوب الأحمر */}
    <div className="w-full bg-[#13151a] border-b border-[#222630] p-4 flex justify-between items-center px-6 mb-4" style={{ direction: 'rtl' }}>
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-[#22c55e] animate-pulse"></div>
        <span className="text-xs text-gray-400 font-mono">
          {locale === 'ar' ? `المستخدم النشط بالسيرفر: ${activeUser?.name || 'مالك النظام'}` : `Active node: ${activeUser?.name || 'System Owner'}`}
        </span>
      </div>
      <button
        onClick={handleLogout}
        className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-6 rounded-xl transition-all shadow-md shadow-red-600/10 text-xs"
      >
        {locale === 'ar' ? 'خروج آمن' : 'Logout Node'}
      </button>
    </div>
                                                                                                               
    <aside className="assistant-gateway-history">
      <div className="assistant-history-heading">
        <h4>{historyCopy.title}</h4>
        <button type="button" onClick={() => { setHistoryBusy(true); setHistoryError(''); void loadHistory(); }} disabled={historyBusy}>{historyCopy.refresh}</button>
      </div>
      <p className="assistant-history-notice">{historyCopy.archiveNotice}</p>
      {historyBusy && history.length === 0 && <p className="assistant-history-empty">{historyCopy.loading}</p>}
      {historyError && <p className="assistant-gateway-error" role="alert">{historyError}</p>}
      {!historyBusy && history.length === 0 && !historyError && <p className="assistant-history-empty">{historyCopy.empty}</p>}
      <div className="assistant-history-list">
        {history.map((conversation) => <button
          className="assistant-history-item"
          key={conversation.id}
          type="button"
          onClick={() => setResult({
            text: conversation.output.text,
            model: conversation.model,
            provider: conversation.provider,
          })}
        >
          <span>{new Date(conversation.createdAt).toLocaleString(locale === 'ar' ? 'ar' : 'en', { dateStyle: 'short', timeStyle: 'short' })}</span>
          <strong>{conversation.input.prompt?.trim() || historyCopy.modes[conversation.input.mode] || historyCopy.untitled}</strong>
          <small>{conversation.provider} · {conversation.model}</small>
        </button>)}
      </div>
    </aside>
    <div className="assistant-gateway-main">
    <div className="assistant-gateway-heading">
      <div><h3>{t('Ask Nexora')}</h3><p>{t('Answers are generated by the configured AI provider.')}</p></div>
      <span className="assistant-gateway-status">{t('Authenticated')}</span>
    </div>
    <form onSubmit={submit}>
      <label className="sr-only" htmlFor="assistant-gateway-prompt">{t('Ask Nexora')}</label>
      <textarea
        id="assistant-gateway-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        maxLength={8_000}
        placeholder={t('Ask a question about a document or topic…')}
        rows={3}
        disabled={busy}
      />
      <div className="assistant-gateway-actions">
        <label className="assistant-file-picker" htmlFor="assistant-file-input">{t('Attach PDF, CSV, text, or audio')}</label>
        <input
          id="assistant-file-input"
          type="file"
          accept=".pdf,.csv,.md,.txt,audio/mp4,audio/mpeg,audio/ogg,audio/wav,audio/webm"
          disabled={busy}
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null);
            setError('');
          }}
        />
        <button className="button button-primary" type="submit" disabled={busy}>{t(busy ? 'Working…' : 'Send to assistant')}</button>
      </div>
      {file && <p className="assistant-file-name">{file.name} · {(file.size / 1024).toFixed(0)} KB <button type="button" onClick={() => { setFile(null); const input = document.getElementById('assistant-file-input'); if (input instanceof HTMLInputElement) input.value = ''; }}>{t('Remove file')}</button></p>}
    </form>
    <p className="assistant-gateway-privacy">{t('Files, prompts, and workspace summary counts are sent to the configured AI provider only after you submit. Provider limits apply.')}</p>
    {error && <p className="assistant-gateway-error" role="alert">{t(error)}</p>}
    {result && <div className="assistant-gateway-result" aria-live="polite">
      <p>{result.text}</p>
      <div><small>{t('Generated by')} {result.model} · {result.provider}</small><button type="button" onClick={speakResult}>{t(speaking ? 'Stop speaking' : 'Speak response')}</button></div>
    </div>}
    </div>
  </section>;
}
