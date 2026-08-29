// In-memory rate limiting tracker for serverless instances
interface RateLimitRecord {
  failedAttempts: number;
  lastAttemptAt: number;
  lockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const WINDOW_DURATION_MS = 15 * 60 * 1000; // 15 minutes window

export function checkRateLimit(identifier: string): { isAllowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record) {
    return { isAllowed: true };
  }

  // Check if actively locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isAllowed: false, retryAfterSeconds };
  }

  // If lockout expired or window passed, reset
  if (now - record.lastAttemptAt > WINDOW_DURATION_MS) {
    rateLimitStore.delete(identifier);
    return { isAllowed: true };
  }

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { isAllowed: false, retryAfterSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  return { isAllowed: true };
}

export function recordFailedAttempt(identifier: string): { isLocked: boolean; attemptsLeft: number } {
  const now = Date.now();
  let record = rateLimitStore.get(identifier);

  if (!record || now - record.lastAttemptAt > WINDOW_DURATION_MS) {
    record = {
      failedAttempts: 1,
      lastAttemptAt: now,
      lockedUntil: null,
    };
  } else {
    record.failedAttempts += 1;
    record.lastAttemptAt = now;
  }

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    rateLimitStore.set(identifier, record);
    return { isLocked: true, attemptsLeft: 0 };
  }

  rateLimitStore.set(identifier, record);
  return {
    isLocked: false,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts),
  };
}

export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}
