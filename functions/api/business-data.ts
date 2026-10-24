import { verifyAccessRequest } from '../_lib/access';
import { parseWorkspaceData } from '../../src/lib/workspaceData';

type D1Statement = {
  bind(...values: (string | number)[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1Database = {
  prepare(query: string): D1Statement;
};

type Environment = {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  DB?: D1Database;
};

type StoredWorkspace = {
  payload: string;
  revision: number;
};

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function getDatabase(environment: Environment): D1Database | Response {
  if (!environment.DB) {
    console.error('Cloudflare D1 binding DB is missing.');
    return jsonError(503, 'Workspace storage is not configured.');
  }
  return environment.DB;
}

export async function onRequestGet({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const auth = await verifyAccessRequest(request, env);
  if (auth.response) return auth.response;
  const database = getDatabase(env);
  if (database instanceof Response) return database;

  try {
    const record = await database
      .prepare('SELECT payload, revision FROM workspace_state WHERE user_id = ?')
      .bind(auth.identity.subject)
      .first<StoredWorkspace>();

    if (!record) {
      return Response.json({ data: null, revision: 0 }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const data = parseWorkspaceData(JSON.parse(record.payload) as unknown);
    if (!data) {
      console.error('Stored workspace data failed schema validation.');
      return jsonError(500, 'Stored workspace data is invalid.');
    }

    return Response.json({ data, revision: record.revision }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not read the authenticated workspace record.', error);
    return jsonError(503, 'Workspace data is temporarily unavailable.');
  }
}

export async function onRequestPut({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const auth = await verifyAccessRequest(request, env);
  if (auth.response) return auth.response;

  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return jsonError(403, 'Cross-origin workspace updates are not allowed.');
  }
  const mediaType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return jsonError(415, 'Workspace updates must use application/json.');
  }

  const contentLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(contentLength) && contentLength > 262_144) {
    return jsonError(413, 'Workspace data exceeds the allowed size.');
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 262_144) {
      return jsonError(413, 'Workspace data exceeds the allowed size.');
    }
    input = JSON.parse(body) as unknown;
  } catch {
    return jsonError(400, 'Workspace data must be valid JSON.');
  }

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return jsonError(400, 'Workspace update must be an object.');
  }
  const update = input as Record<string, unknown>;
  if (Object.keys(update).length !== 2
    || !Object.prototype.hasOwnProperty.call(update, 'revision')
    || !Object.prototype.hasOwnProperty.call(update, 'data')
    || !Number.isSafeInteger(update.revision)
    || (update.revision as number) < 0) {
    return jsonError(400, 'Workspace update version is invalid.');
  }
  const data = parseWorkspaceData(update.data);
  if (!data) return jsonError(400, 'Workspace data does not match the supported schema.');

  const database = getDatabase(env);
  if (database instanceof Response) return database;

  try {
    const saved = await database.prepare(
      'INSERT INTO workspace_state (user_id, payload, revision, updated_at) SELECT ?, ?, 1, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM workspace_state WHERE user_id = ? AND revision = ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, revision = workspace_state.revision + 1, updated_at = excluded.updated_at WHERE workspace_state.revision = ? RETURNING revision',
    ).bind(
      auth.identity.subject,
      JSON.stringify(data),
      Date.now(),
      update.revision as number,
      auth.identity.subject,
      update.revision as number,
      update.revision as number,
    )
      .first<{ revision: number }>();

    if (!saved) return jsonError(409, 'Workspace data changed in another session. Reload before saving again.');
    return Response.json({ saved: true, revision: saved.revision }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not save the authenticated workspace record.', error);
    return jsonError(503, 'Workspace data could not be saved.');
  }
}
