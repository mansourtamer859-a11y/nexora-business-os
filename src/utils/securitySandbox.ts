const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MAX_GATE_FAILURES = 5;
const GATE_FAILURE_WINDOW_MS = 60_000;
const GATE_LOCKOUT_MS = 30_000;

export type GateAttemptGuard = {
  recordFailure: (now?: number) => { locked: boolean; retryAfterMs: number };
  reset: () => void;
};

export function createGateAttemptGuard(): GateAttemptGuard {
  let failures: number[] = [];
  let lockedUntil = 0;

  return {
    recordFailure(now = Date.now()) {
      if (now < lockedUntil) {
        return { locked: true, retryAfterMs: lockedUntil - now };
      }
      failures = failures.filter((timestamp) => now - timestamp < GATE_FAILURE_WINDOW_MS);
      failures.push(now);
      if (failures.length >= MAX_GATE_FAILURES) {
        lockedUntil = now + GATE_LOCKOUT_MS;
        failures = [];
        return { locked: true, retryAfterMs: GATE_LOCKOUT_MS };
      }
      return { locked: false, retryAfterMs: 0 };
    },
    reset() {
      failures = [];
      lockedUntil = 0;
    },
  };
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.codePointAt(0);
    return code !== undefined && (code < 32 || code === 127);
  });
}

export function sanitizePlainText(value: string, maxLength = 500): string {
  return Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0);
      return code !== undefined && code >= 32 && code !== 127;
    })
    .slice(0, maxLength)
    .join('');
}

export function normalizeDemoEmail(value: string): string | null {
  const normalized = value.trim().normalize('NFC');
  if (normalized.length > MAX_EMAIL_LENGTH || hasControlCharacters(normalized)) return null;
  const email = sanitizePlainText(normalized, MAX_EMAIL_LENGTH);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function isValidDemoPassword(value: string): boolean {
  return value.length >= 8
    && value.length <= MAX_PASSWORD_LENGTH
    && !hasControlCharacters(value);
}

export function isValidDemoAccessToken(value: string): boolean {
  return value.length === 7 && value === '#117007';
}
