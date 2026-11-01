import { handleAssistantRequest } from '../_lib/assistantGateway';
import type { AIProviderEnvironment } from '../_lib/aiProviders';
import type { AuthEnvironment } from '../_lib/session';

type Environment = AuthEnvironment & AIProviderEnvironment;

export async function onRequestPost({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  return handleAssistantRequest(request, env);
}
