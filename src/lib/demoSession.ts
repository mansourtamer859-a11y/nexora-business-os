import { normalizeDemoEmail } from '../utils/securitySandbox';

export const DEMO_SESSION_STORAGE_KEY = 'nexus-demo-session-v1';
export const DEMO_DEVICE_STORAGE_KEY = 'nexus-demo-installation-v1';
export const DEMO_SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type DemoSession = {
  email: string;
  deviceId: string;
  expiresAt: number;
};

export type DemoSessionRead = {
  session: DemoSession | null;
  notice: string;
};

const deviceIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isDemoSession(value: unknown): value is DemoSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const now = Date.now();
  return typeof candidate.email === 'string'
    && candidate.email.length > 0
    && candidate.email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)
    && typeof candidate.deviceId === 'string'
    && deviceIdPattern.test(candidate.deviceId)
    && typeof candidate.expiresAt === 'number'
    && Number.isFinite(candidate.expiresAt)
    && candidate.expiresAt > now
    && candidate.expiresAt <= now + DEMO_SESSION_TTL_MS;
}

function clearSessionRecord() {
  window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(DEMO_DEVICE_STORAGE_KEY);
}

export function readDemoSession(): DemoSessionRead {
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (!raw) return { session: null, notice: '' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      clearSessionRecord();
      return { session: null, notice: 'The saved demo session was invalid. Please sign in again.' };
    }

    const installationId = window.localStorage.getItem(DEMO_DEVICE_STORAGE_KEY);
    if (!isDemoSession(parsed) || !installationId || parsed.deviceId !== installationId) {
      clearSessionRecord();
      return { session: null, notice: 'This browser has no valid remembered demo session. Please sign in again.' };
    }

    return { session: parsed, notice: '' };
  } catch {
    return { session: null, notice: 'Browser storage is unavailable. Continue using this demo without remembering the device.' };
  }
}

export function rememberDemoSession(email: string): { session: DemoSession | null; notice: string } {
  try {
    const normalizedEmail = normalizeDemoEmail(email);
    if (!normalizedEmail) return { session: null, notice: 'The demo email is invalid. Please sign in again.' };

    let deviceId = window.localStorage.getItem(DEMO_DEVICE_STORAGE_KEY);
    if (!deviceId || !deviceIdPattern.test(deviceId)) {
      deviceId = window.crypto.randomUUID();
      window.localStorage.setItem(DEMO_DEVICE_STORAGE_KEY, deviceId);
    }

    const session: DemoSession = {
      email: normalizedEmail,
      deviceId,
      expiresAt: Date.now() + DEMO_SESSION_TTL_MS,
    };
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(session));
    return { session, notice: '' };
  } catch {
    return { session: null, notice: 'Sign-in completed for this tab, but browser storage prevented remembering the device.' };
  }
}

export function forgetDemoSession(): string {
  try {
    clearSessionRecord();
    return '';
  } catch {
    return 'Browser storage could not be cleared. Close this tab to end the current demo session.';
  }
}
