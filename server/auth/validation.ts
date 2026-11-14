import crypto from 'crypto';
import type { UserRole } from '../../src/types/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

export function isValidFullName(name: string): boolean {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

export function isCreatableSubRole(role: string): role is 'CAPTAIN' | 'AUTHORITY' {
  return role === 'CAPTAIN' || role === 'AUTHORITY';
}

export function isValidRole(role: string): role is UserRole {
  return role === 'ADMIN' || role === 'CAPTAIN' || role === 'AUTHORITY';
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string.'] };
  }
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Include at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Include at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Include at least one number.');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Include at least one special character (e.g. !@#$%).');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates a cryptographically random password guaranteed to satisfy
 * uppercase, lowercase, numeric, and symbol requirements.
 */
export function generateSecurePassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*_-+=';
  const all = upper + lower + digits + symbols;

  const chars: string[] = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    symbols[crypto.randomInt(symbols.length)],
  ];

  const targetLen = Math.max(12, length);
  while (chars.length < targetLen) {
    chars.push(all[crypto.randomInt(all.length)]);
  }

  // Fisher-Yates shuffle with crypto.randomInt
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}
