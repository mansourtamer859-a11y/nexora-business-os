import {
  getSessionIdentity,
  requireSameOrigin,
  unauthorized,
  type AuthEnvironment,
} from './session';
import { requireAccessGate } from './accessGate';
import {
  generateAssistantResponse,
  MissingAudioModelError,
  ProviderRequestError,
  UnsupportedProviderInputError,
  type AIProviderEnvironment,
  type NormalizedAssistantInput,
} from './aiProviders';
import { parseWorkspaceData } from '../../src/lib/workspaceData';

type AssistantEnvironment = AuthEnvironment & AIProviderEnvironment;

const maxRequestBytes = 1_500_000;
const maxTextLength = 100_000;
const maxInlineBase64Length = 1_350_000;
const audioMimeTypes = new Set([
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
]);

function jsonResponse(status: number, body: Record<string, unknown>, retryAfter?: string | null): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (retryAfter && /^\d{1,5}$/u.test(retryAfter)) headers.set('Retry-After', retryAfter);
  return Response.json(body, { status, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readAssistantInput(request: Request): Promise<NormalizedAssistantInput | Response> {
  const mediaType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return jsonResponse(415, { error: 'Assistant requests must use application/json.' });
  }
  const declaredLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBytes) {
    return jsonResponse(413, { error: 'Assistant request exceeds the allowed size.' });
  }

  let value: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maxRequestBytes) {
      return jsonResponse(413, { error: 'Assistant request exceeds the allowed size.' });
    }
    value = JSON.parse(body) as unknown;
  } catch {
    return jsonResponse(400, { error: 'Assistant request must contain valid JSON.' });
  }

  const allowedFields = ['mode', 'locale', 'prompt', 'documentText', 'fileBase64', 'mimeType'];
  if (!isRecord(value)
    || Object.keys(value).some((key) => !allowedFields.includes(key))
    || (value.mode !== 'text' && value.mode !== 'document' && value.mode !== 'audio')) {
    return jsonResponse(400, { error: 'Assistant request format is invalid.' });
  }

  for (const key of ['prompt', 'documentText', 'fileBase64', 'mimeType'] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
      return jsonResponse(400, { error: 'Assistant request format is invalid.' });
    }
  }
  if (value.locale !== undefined && value.locale !== 'ar' && value.locale !== 'en') {
    return jsonResponse(400, { error: 'Assistant request format is invalid.' });
  }

  const input: NormalizedAssistantInput = { mode: value.mode };
  if (value.locale === 'ar' || value.locale === 'en') input.locale = value.locale;
  if (typeof value.prompt === 'string') input.prompt = value.prompt;
  if (typeof value.documentText === 'string') input.documentText = value.documentText;
  if (typeof value.fileBase64 === 'string') input.fileBase64 = value.fileBase64;
  if (typeof value.mimeType === 'string') input.mimeType = value.mimeType;
  if (input.prompt && input.prompt.length > 8_000) {
    return jsonResponse(413, { error: 'Assistant prompt exceeds the allowed size.' });
  }
  if (input.mode === 'text' && !input.prompt?.trim()) {
    return jsonResponse(400, { error: 'Enter a question for the assistant.' });
  }
  if (input.mode === 'text' && (input.documentText || input.fileBase64 || input.mimeType)) {
    return jsonResponse(400, { error: 'Assistant request format is invalid.' });
  }
  if (input.documentText && input.documentText.length > maxTextLength) {
    return jsonResponse(413, { error: 'Document text exceeds the allowed size.' });
  }
  if (input.fileBase64
    && (input.fileBase64.length > maxInlineBase64Length
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(input.fileBase64))) {
    return jsonResponse(413, { error: 'Uploaded content is invalid or exceeds the allowed size.' });
  }

  if (input.mode === 'document') {
    const hasText = typeof input.documentText === 'string' && input.documentText.trim().length > 0;
    const hasPdf = input.mimeType === 'application/pdf' && Boolean(input.fileBase64);
    if (!hasText && !hasPdf) {
      return jsonResponse(400, { error: 'Provide PDF, CSV, or plain-text document content.' });
    }
    if (hasText && input.fileBase64) {
      return jsonResponse(400, { error: 'Provide one document format per request.' });
    }
    if (input.mimeType && !input.fileBase64) {
      return jsonResponse(400, { error: 'Assistant request format is invalid.' });
    }
  }
  if (input.mode === 'audio'
    && (!input.fileBase64 || !input.mimeType || !audioMimeTypes.has(input.mimeType))) {
    return jsonResponse(400, { error: 'Provide a supported audio recording.' });
  }
  if (input.mode === 'audio' && input.documentText) {
    return jsonResponse(400, { error: 'Assistant request format is invalid.' });
  }

  return input;
}

export async function handleAssistantRequest(request: Request, environment: AssistantEnvironment): Promise<Response> {
  const gateError = await requireAccessGate(request, environment);
  if (gateError) return gateError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const identity = await getSessionIdentity(request, environment);
  if (identity instanceof Response) return identity;
  if (!identity) return unauthorized();

  const input = await readAssistantInput(request);
  if (input instanceof Response) return input;
  if (!environment.DB) return jsonResponse(503, { error: 'Workspace storage is not configured.' });

  let workspaceSummary = 'No workspace records are available.';
  try {
    const storedWorkspace = await environment.DB
      .prepare('SELECT payload FROM workspace_state WHERE user_id = ?')
      .bind(identity.id)
      .first<{ payload: string }>();
    if (storedWorkspace) {
      const workspace = parseWorkspaceData(JSON.parse(storedWorkspace.payload) as unknown);
      if (!workspace) {
        console.error('Stored workspace data failed validation for an assistant request.');
        return jsonResponse(503, { error: 'Workspace data is temporarily unavailable.' });
      }
      workspaceSummary = JSON.stringify({
        crmOpportunityCount: workspace.deals.length,
        invoiceCount: workspace.invoices.length,
        inventoryUnits: workspace.inventoryOnHand,
      });
    }
  } catch (error) {
    console.error('Could not read the authenticated workspace summary for the assistant.', error);
    return jsonResponse(503, { error: 'Workspace data is temporarily unavailable.' });
  }

  const systemText = `The authenticated user's current workspace aggregate summary is: ${workspaceSummary}. It contains counts only; do not infer individual records or financial values. Clearly state when information is not present in the supplied content or summary.`;
  try {
    const result = await generateAssistantResponse(input, environment, systemText);
    return jsonResponse(200, result);
  } catch (error) {
    if (error instanceof UnsupportedProviderInputError) {
      return jsonResponse(415, { error: error.message });
    }
    if (error instanceof MissingAudioModelError) {
      return jsonResponse(503, { error: 'Audio transcription is not configured for this deployment.' });
    }
    if (error instanceof ProviderRequestError) {
      if (error.status === 429) {
        return jsonResponse(429, { error: 'The AI provider rate limit was reached. Please try again later.' }, error.retryAfter);
      }
      if (error.status === 503) {
        return jsonResponse(503, { error: 'The AI provider is temporarily unavailable. Please try again later.' });
      }
      console.error(`Configured AI provider rejected the assistant request with HTTP ${error.status}.`);
      return jsonResponse(502, { error: 'The AI provider could not process this request.' });
    }
    console.error('Assistant provider configuration or response processing failed.', error);
    return jsonResponse(503, { error: 'The AI assistant is not configured correctly or the provider returned an invalid response.' });
  }
}
