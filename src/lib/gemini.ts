import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchGeminiStream } from '../lib/gemini';
import { persistChatTurns, resolveChatSessionId } from '../lib/supabase';
import type { ChatMessage } from '../types';

type ChatPanelProps = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
};

const suggestedPrompts = [
  'Analyze System Latency',
  'Review User Traffic',
  'Summarize Platform Alerts',
  'Check Monthly Growth',
];

export function ChatPanel({ messages, setMessages }: ChatPanelProps) {
  const { session } = useAuth();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const emptyState = useMemo(() => messages.length === 0, [messages.length]);

  const sendMessage = useCallback(async (promptOverride?: string) => {
    const nextPrompt = (promptOverride ?? input).trim();
    if (!nextPrompt || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: nextPrompt,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const activeSessionId = await resolveChatSessionId(session?.userId ?? 'demo-user');
      const history = [...messages, userMessage].slice(-8);
      const assistantText = await fetchGeminiStream({
        messages: history,
        systemPrompt:
          'You are the NEXORA Nexus Prime AI assistant. Provide concise, executive-ready insights about system health, user growth, and operational risk. Answer in clear business language and highlight practical recommendations when relevant.',
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText,
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);
      await persistChatTurns({ sessionId: activeSessionId, turns: [userMessage, assistantMessage] });
    } catch (error) {
      console.error('Gemini request failed:', error);
      const fallbackMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'The Gemini service is temporarily unavailable, but your latest request was captured securely and the session remains active.',
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, fallbackMessage]);

      try {
        const activeSessionId = await resolveChatSessionId(session?.userId ?? 'demo-user');
        await persistChatTurns({ sessionId: activeSessionId, turns: [userMessage, fallbackMessage] });
      } catch (persistError) {
        console.error('Fallback persistence failed:', persistError);
      }
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages, session, setMessages]);

  return (
    <div className="panel chat-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI copilot</p>
          <h3>Session-based assistant</h3>
        </div>
        <span className="status-badge neutral">{isSending ? 'Thinking…' : 'Live'}</span>
      </div>

      {emptyState && (
        <div className="prompt-grid">
          {suggestedPrompts.map((prompt) => (
            <button key={prompt} className="prompt-chip" onClick={() => void sendMessage(prompt)} disabled={isSending}>
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="chat-list" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.role}`}>
            <p>{message.content}</p>
          </div>
        ))}

        {isSending && (
          <div className="chat-bubble assistant typing-bubble" aria-live="polite">
            <div className="typing-indicator" aria-label="Assistant is typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void sendMessage();
            }
          }}
          placeholder="Ask the copilot to analyze workflow health..."
          aria-label="Ask the AI assistant"
          disabled={isSending}
        />
        <button className="primary-button" onClick={() => void sendMessage()} disabled={isSending}>
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

