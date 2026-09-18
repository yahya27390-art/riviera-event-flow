/**
 * Defensive Cybersecurity & Cryptography Engine v2
 * Conforms to strict zero-plaintext rules and Saudi PDPL compliance
 * Enhanced: Unlock Rate Limiting + Session Fingerprinting
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

// ─── UNLOCK Rate Limiter (separate — stricter than login) ─────────────────────
// Only 3 wrong unlock attempts allowed before forced full logout
const UNLOCK_RATE_KEY = 'qemat_alreef_unlock_attempts';
const MAX_UNLOCK_ATTEMPTS = 3;
const UNLOCK_LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes

export function checkUnlockRateLimit() {
  const dataStr = localStorage.getItem(UNLOCK_RATE_KEY);
  if (!dataStr) return { allowed: true, remaining: MAX_UNLOCK_ATTEMPTS };

  try {
    const data = JSON.parse(dataStr);
    const now = Date.now();

    if (data.lockedUntil && now < data.lockedUntil) {
      const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
      return {
        allowed: false,
        locked: true,
        forceLogout: true,
        remainingSeconds,
        remainingMinutes: Math.ceil(remainingSeconds / 60)
      };
    }

    // Reset if lockout expired
    if (data.lockedUntil && now >= data.lockedUntil) {
      localStorage.removeItem(UNLOCK_RATE_KEY);
      return { allowed: true, remaining: MAX_UNLOCK_ATTEMPTS };
    }

    const remaining = Math.max(0, MAX_UNLOCK_ATTEMPTS - (data.attempts || 0));
    return { allowed: remaining > 0, remaining, forceLogout: remaining === 0 };
  } catch {
    localStorage.removeItem(UNLOCK_RATE_KEY);
    return { allowed: true, remaining: MAX_UNLOCK_ATTEMPTS };
  }
}

export function recordFailedUnlockAttempt() {
  const dataStr = localStorage.getItem(UNLOCK_RATE_KEY);
  let data = { attempts: 0, firstAttemptTime: Date.now() };

  if (dataStr) {
    try { data = JSON.parse(dataStr); } catch {
      data = { attempts: 0, firstAttemptTime: Date.now() };
    }
  }

  data.attempts = (data.attempts || 0) + 1;

  if (data.attempts >= MAX_UNLOCK_ATTEMPTS) {
    data.lockedUntil = Date.now() + UNLOCK_LOCKOUT_MS;
  }

  localStorage.setItem(UNLOCK_RATE_KEY, JSON.stringify(data));
  return checkUnlockRateLimit();
}

export function resetUnlockAttempts() {
  localStorage.removeItem(UNLOCK_RATE_KEY);
}

// ─── Session Fingerprint ──────────────────────────────────────────────────────
/**
 * Generates a browser fingerprint to detect if localStorage session was copied
 * to another device or browser. Not perfect but raises the bar significantly.
 */
export async function generateSessionFingerprint() {
  const traits = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency || '?',
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('||');

  const encoder = new TextEncoder();
  const data = encoder.encode(`QEMAT_SESSION_FP:${traits}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Validate saved fingerprint against current browser environment.
 * Returns true for legacy sessions without fingerprint (backward compat).
 */
export async function validateSessionFingerprint(savedFingerprint) {
  if (!savedFingerprint) return true;
  try {
    const currentFp = await generateSessionFingerprint();
    return currentFp === savedFingerprint;
  } catch {
    return true; // On error, don't block legitimate users
  }
}

// ─── Session Age Check ────────────────────────────────────────────────────────
/**
 * Returns true if the session has NOT exceeded maxHours since login.
 * @param {number} loginTime - Date.now() at login
 * @param {number} maxHours - Maximum session duration (default 12h)
 */
export function isSessionValid(loginTime, maxHours = 12) {
  if (!loginTime) return false;
  const maxMs = maxHours * 60 * 60 * 1000;
  return (Date.now() - loginTime) < maxMs;
}

