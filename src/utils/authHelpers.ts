/**
 * Pure authentication & profile helpers for SEATLOCK UI.
 * Decoupled from browser globals so every function is unit-tested in Node.
 */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  isValid: boolean;
}

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Returns true if the given email address belongs to Gmail.
 */
export function isGmailAddress(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = normalized.slice(atIndex + 1);
  return GMAIL_DOMAINS.has(domain);
}

/**
 * Validates basic email address format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Extracts a clean, human-readable display name directly from an email address.
 * Examples:
 * - "akash.rana@gmail.com" -> "Akash Rana"
 * - "akash_rana98@gmail.com" -> "Akash Rana"
 * - "priya-verma+campus@gmail.com" -> "Priya Verma"
 * - "akashRana2026@gmail.com" -> "Akash Rana"
 * - "ar9816095@gmail.com" -> "Ar"
 */
export function extractNameFromEmail(email: string): string {
  const normalized = email.trim();
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0) return '';

  // Strip Gmail "+alias" tags before deriving the name
  const localRaw = normalized.slice(0, atIndex).split('+')[0];
  if (!localRaw) return '';

  // Split camelCase boundaries (e.g. akashRana -> akash Rana)
  const camelSplit = localRaw.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Split on dots, underscores, hyphens, and whitespace
  const rawTokens = camelSplit.split(/[._\-\s]+/).filter(Boolean);

  const cleanedTokens = rawTokens
    .map((token) => {
      // Remove leading/trailing digits from tokens like "rana98" or "2026akash"
      const lettersOnly = token.replace(/^\d+|\d+$/g, '');
      return lettersOnly.replace(/[^a-zA-Z]/g, '');
    })
    .filter((token) => token.length > 0);

  if (cleanedTokens.length === 0) {
    // Fallback if local part was purely numeric (e.g. "202601@gmail.com")
    return `Student ${localRaw.slice(0, 6)}`;
  }

  return cleanedTokens
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Produces 1-2 uppercase initials from a display name.
 */
export function getInitialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * Evaluates password strength for the user-created password flow.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (password.length < 6) {
    return { score: 0, label: 'Too short', isValid: false };
  }

  let points = 1;
  if (password.length >= 8) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^a-zA-Z0-9]/.test(password)) points += 1;

  const clamped = Math.min(4, points) as 1 | 2 | 3 | 4;
  const labels: Record<1 | 2 | 3 | 4, PasswordStrength['label']> = {
    1: 'Weak',
    2: 'Fair',
    3: 'Strong',
    4: 'Very strong',
  };

  return {
    score: clamped,
    label: labels[clamped],
    isValid: true,
  };
}

/**
 * Deterministic salted hash for Local Demo Mode password storage.
 * Ensures user-created passwords are never persisted in plaintext in localStorage.
 */
export function hashPasswordLocal(email: string, password: string): string {
  const input = `seatlock::${email.trim().toLowerCase()}::${password}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `slh_${part1}${part2}`;
}
