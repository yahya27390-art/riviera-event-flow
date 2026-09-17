/**
 * Defensive Cybersecurity & Cryptography Engine
 * Conforms to strict zero-plaintext rules and Saudi PDPL compliance
 */

const DEFAULT_SALT = 'qemat_alreef_secure_salt_v1_2026';

/**
 * Generate SHA-256 hash using native Web Crypto API
 */
export async function hashPasscode(passcode, salt = DEFAULT_SALT) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${passcode}:${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify passcode against stored hash
 */
export async function verifyPasscode(inputPasscode, storedHash, salt = DEFAULT_SALT) {
  if (!inputPasscode || !storedHash) return false;
  const computedHash = await hashPasscode(inputPasscode, salt);
  return computedHash === storedHash;
}

/**
 * Sanitize text input to prevent XSS and Formula Injection (CSV/Excel)
 */
export function sanitizeInput(value) {
  if (typeof value !== 'string') return value;
  let sanitized = value.trim();
  // Strip formula injection prefixes for Excel/CSV safety
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }
  // Basic XSS tag escaping
  sanitized = sanitized.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return sanitized;
}

/**
 * Rate Limiter for Login Attempts
 */
const RATE_LIMIT_KEY = 'qemat_alreef_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export function checkLoginRateLimit() {
  const dataStr = localStorage.getItem(RATE_LIMIT_KEY);
  if (!dataStr) return { allowed: true, remaining: MAX_ATTEMPTS };

  try {
    const data = JSON.parse(dataStr);
    const now = Date.now();

    if (data.lockedUntil && now < data.lockedUntil) {
      const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
      return { 
        allowed: false, 
        locked: true, 
        remainingSeconds,
        remainingMinutes: Math.ceil(remainingSeconds / 60)
      };
    }

    // Reset if lockout expired
    if (data.lockedUntil && now >= data.lockedUntil) {
      localStorage.removeItem(RATE_LIMIT_KEY);
      return { allowed: true, remaining: MAX_ATTEMPTS };
    }

    const remaining = Math.max(0, MAX_ATTEMPTS - (data.attempts || 0));
    return { allowed: remaining > 0, remaining };
  } catch {
    localStorage.removeItem(RATE_LIMIT_KEY);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }
}

export function recordFailedLoginAttempt() {
  const dataStr = localStorage.getItem(RATE_LIMIT_KEY);
  let data = { attempts: 0, firstAttemptTime: Date.now() };

  if (dataStr) {
    try {
      data = JSON.parse(dataStr);
    } catch {
      data = { attempts: 0, firstAttemptTime: Date.now() };
    }
  }

  data.attempts = (data.attempts || 0) + 1;

  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_MS;
  }

  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  return checkLoginRateLimit();
}

export function resetLoginAttempts() {
  localStorage.removeItem(RATE_LIMIT_KEY);
}
