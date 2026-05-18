// Username validation rules for production-grade TradePost
export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 20,
  pattern: /^[a-z0-9_.]+$/, // lowercase letters, numbers, dots, underscores only
  reserved: ['admin', 'root', 'system', 'support', 'tradepost', 'api', 'app', 'web', 'mobile', 'test'],
};

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim().toLowerCase();

  if (trimmed.length < USERNAME_RULES.minLength) {
    return { valid: false, error: `Username must be at least ${USERNAME_RULES.minLength} characters` };
  }

  if (trimmed.length > USERNAME_RULES.maxLength) {
    return { valid: false, error: `Username must not exceed ${USERNAME_RULES.maxLength} characters` };
  }

  if (!USERNAME_RULES.pattern.test(trimmed)) {
    return { valid: false, error: 'Username can only contain lowercase letters, numbers, dots, and underscores' };
  }

  if (USERNAME_RULES.reserved.includes(trimmed)) {
    return { valid: false, error: 'This username is reserved and unavailable' };
  }

  // Prevent usernames starting/ending with dots or underscores
  if (trimmed.startsWith('.') || trimmed.startsWith('_') || trimmed.endsWith('.') || trimmed.endsWith('_')) {
    return { valid: false, error: 'Username cannot start or end with dots or underscores' };
  }

  // Prevent consecutive dots or underscores
  if (/[._]{2,}/.test(trimmed)) {
    return { valid: false, error: 'Username cannot contain consecutive dots or underscores' };
  }

  return { valid: true };
}

export function sanitizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
}
