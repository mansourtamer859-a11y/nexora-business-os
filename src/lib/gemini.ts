import { useCallback, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchGeminiResponse } from '../lib/gemini';
import { persistChatTurns, resolveChatSessionId } from '../lib/supabase';
import type { ChatMessage } from '../types';

type ChatPanelProps = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
};

export function ChatPanel({ messages, setMessages }: ChatPanelProps) {
  const { session } = useAuth();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const activeSessionId = await resolveChatSessionId(session?.userId ?? 'demo-user');
      const history = [...messages, userMessage].slice(-8);
      const assistantText = await fetchGeminiResponse({
        messages: history,
        systemPrompt:
          'You are the NEXORA Business OS AI assistant. Provide concise, executive-ready insights about system health, user growth, and operational risk. Always answer in plain business language with recommendations when useful.',
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

      <div className="chat-list" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.role}`}>
            <p>{message.content}</p>
          </div>
        ))}
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
