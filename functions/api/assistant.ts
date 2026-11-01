import { handleAssistantRequest } from '../_lib/assistantGateway';
import type { AuthEnvironment } from '../_lib/session';

type Environment = AuthEnvironment & {
  GEMINI_API_KEY?: string;
  GEMINI_MODELS?: string;
};

export async function onRequestPost({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  return handleAssistantRequest(request, env);
}
