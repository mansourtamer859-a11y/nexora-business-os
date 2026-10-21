import { appConfig, isGeminiConfigured } from '../config/env';
import type { ChatMessage } from '../types';

const parseGeminiText = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const candidate = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  return text ?? '';
};

export async function fetchGeminiStream({
  messages,
  systemPrompt,
}: {
  messages: ChatMessage[];
  systemPrompt: string;
}) {
  if (!isGeminiConfigured || !appConfig.geminiApiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Configure the Gemini API key in your environment before using the assistant.');
  }

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 500,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${appConfig.geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return parseGeminiText(data) || 'The assistant could not generate a response. Please try again.';
}

