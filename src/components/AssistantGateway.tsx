import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
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
