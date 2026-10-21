import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchGeminiStream } from '../lib/gemini';
import { persistChatTurns, resolveChatSessionId } from '../lib/supabase';
import type { ChatMessage } from '../types';

type ChatPanelProps = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
};

const suggestedPrompts = ['Analyze System Latency', 'Review User Traffic', 'Summarize KPI Drift', 'Inspect Revenue Momentum'];

export function ChatPanel({ messages, setMessages }: ChatPanelProps) {
  const { session } = useAuth();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isEmpty = useMemo(() => messages.length === 0, [messages.length]);

  const sendMessage = useCallback(
    async (promptOverride?: string) => {
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
        const sessionId = await resolveChatSessionId(session?.userId ?? 'nexus-admin');
        const history = [...messages, userMessage].slice(-8);

        const assistantText = await fetchGeminiStream({
          messages: history,
          systemPrompt:
            'You are the NEXUS SaaS ERP OS AI advisor. Focus on enterprise operational metrics, system health, revenue, security, and productivity. Keep responses concise but highly actionable.',
        });

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: assistantText,
          createdAt: new Date().toISOString(),
        };

        setMessages((current) => [...current, assistantMessage]);
        await persistChatTurns({ sessionId, turns: [userMessage, assistantMessage] });
      } catch (error) {
        console.error('Gemini request failed:', error);
        const fallbackMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            'The real-time AI service is temporarily unavailable; your request was still logged to the active enterprise session.',
          createdAt: new Date().toISOString(),
        };

        setMessages((current) => [...current, fallbackMessage]);

        try {
          const sessionId = await resolveChatSessionId(session?.userId ?? 'nexus-admin');
          await persistChatTurns({ sessionId, turns: [userMessage, fallbackMessage] });
        } catch (persistError) {
          console.error('Fallback persistence failed:', persistError);
        }
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending, messages, session, setMessages],
  );

  return (
    <div className="glass-panel chat-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI companion</p>
          <h3>Executive advisor</h3>
        </div>
        <span className="status-badge neutral">{isSending ? 'Live analysis' : 'Ready'}</span>
      </div>

      {isEmpty && (
        <div className="prompt-grid">
          {suggestedPrompts.map((prompt) => (
            <button key={prompt} className="prompt-chip" onClick={() => void sendMessage(prompt)} disabled={isSending}>
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="chat-list">
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
          placeholder="Ask the AI assistant to analyze performance..."
          aria-label="Ask the AI assistant"
          disabled={isSending}
        />
        <button className="primary-button" type="button" onClick={() => void sendMessage()} disabled={isSending}>
          {isSending ? 'Processing...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

