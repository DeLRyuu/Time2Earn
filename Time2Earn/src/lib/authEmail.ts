/**
 * Deterministic conversion of usernames to valid Firebase Auth emails.
 *
 * Rules:
 * - Lowercase the username.
 * - Allowed characters in email local-part: a-z, 0-9, ., _, -
 * - Any character outside [a-z0-9._-] is encoded as `_xHH` where HH is the hex ASCII code.
 * - Domain: @time2earn.app
 */

export const AUTH_EMAIL_DOMAIN = 'time2earn.app';

export function usernameToAuthEmail(username: string): string {
  const clean = username.trim().toLowerCase();
  let localPart = '';

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (/^[a-z0-9._-]$/.test(char)) {
      localPart += char;
    } else {
      const code = char.charCodeAt(0).toString(16).padStart(2, '0');
      localPart += `_x${code}`;
    }
  }

  // Ensure local part is not empty
  if (!localPart) {
    localPart = 'user_anonymous';
  }

  return `${localPart}@${AUTH_EMAIL_DOMAIN}`;
}
