import crypto from 'crypto';

const JWT_SECRET = process.env.SESSION_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'bk-secret-session-key-change-in-prod-min-32-chars';

export interface SessionPayload {
  studentId: string;
  fullName: string;
  className: string;
  schoolYear: string;
  exp: number; // Unix timestamp in seconds
  iat: number;
}

/**
 * Base64URL encode/decode helpers
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Create HMAC SHA256 signature
 */
function signHmac(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generate a short-lived session JWT (20 minutes by default)
 */
export function createSessionToken(
  student: { id: string; fullName: string; className: string; schoolYear: string },
  expiresInSeconds = 1200 // 20 minutes
): { token: string; exp: number } {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: SessionPayload = {
    studentId: student.id,
    fullName: student.fullName,
    className: student.className,
    schoolYear: student.schoolYear,
    iat: now,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signHmac(`${encodedHeader}.${encodedPayload}`, JWT_SECRET);

  return {
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
    exp,
  };
}

/**
 * Verify and parse session JWT
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSignature = signHmac(`${headerB64}.${payloadB64}`, JWT_SECRET);

    // Constant time compare to prevent timing attacks
    const sigA = Buffer.from(signatureB64);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);

    if (!payload.exp || payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify a PIN against a stored salt & hash using constant-time check
 */
export function verifyPin(pin: string, storedHash: string, salt: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(pin, salt, 10000, 64, 'sha256').toString('hex');
    const hashA = Buffer.from(computedHash, 'utf8');
    const hashB = Buffer.from(storedHash, 'utf8');
    if (hashA.length !== hashB.length) return false;
    return crypto.timingSafeEqual(hashA, hashB);
  } catch {
    return false;
  }
}
