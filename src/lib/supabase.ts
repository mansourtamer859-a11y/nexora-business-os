import { appConfig, isGeminiConfigured } from '../config/env';
import type { ChatMessage } from '../types';

export async function fetchGeminiResponse({
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
  const result =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim() ??
    'The assistant could not generate a response. Please try again.';

  return result;
}
