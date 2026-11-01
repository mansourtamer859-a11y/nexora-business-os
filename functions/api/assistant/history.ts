import { requireAccessGate } from '../../_lib/accessGate';
import {
  decryptAuditPayload,
  validateAuditEncryptionKey,
  type EncryptedAssistantInput,
} from '../../_lib/aiProviders';
import { getSessionIdentity, type AuthEnvironment } from '../../_lib/session';

type Environment = AuthEnvironment & {
  AI_LOG_ENCRYPTION_KEY?: string;
};

type StoredConversation = {
  id: string;
  active_provider: string;
  model_name: string;
  input_payload: string;
  output_payload: string;
  created_at: number;
};

type ConversationOutput = { text: string };

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const gateError = await requireAccessGate(request, env);
  if (gateError) return gateError;
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return jsonError(403, 'Cross-origin conversation history requests are not allowed.');
  }
  const identity = await getSessionIdentity(request, env);
  if (identity instanceof Response) return identity;
  if (!identity) return jsonError(401, 'Authentication is required.');

  const encryptionKey = validateAuditEncryptionKey(env.AI_LOG_ENCRYPTION_KEY);
  if (!encryptionKey) {
    console.error('AI_LOG_ENCRYPTION_KEY is missing or invalid.');
    return jsonError(503, 'Secure conversation history is not configured for this deployment.');
  }
  if (!env.DB) {
    console.error('Cloudflare D1 binding DB is missing for conversation history.');
    return jsonError(503, 'Conversation history storage is not configured.');
  }

  try {
    const statement = env.DB.prepare(
      'SELECT id, active_provider, model_name, input_payload, output_payload, created_at FROM ai_conversation_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    ).bind(identity.id);
    if (!statement.all) throw new Error('D1 query results are not available in this runtime.');
    const records = await statement.all<StoredConversation>();
    const conversations = await Promise.all(records.results.map(async (record) => {
      const input = await decryptAuditPayload<EncryptedAssistantInput>(record.input_payload, encryptionKey);
      return {
        id: record.id,
        provider: record.active_provider,
        model: record.model_name,
        createdAt: record.created_at,
        input: {
          mode: input.mode,
          locale: input.locale,
          prompt: input.prompt,
          attachment: input.attachment,
        },
        output: await decryptAuditPayload<ConversationOutput>(record.output_payload, encryptionKey),
      };
    }));
    return Response.json({ conversations }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not read the encrypted assistant conversation history.', error);
    return jsonError(503, 'Conversation history is temporarily unavailable.');
  }
}
