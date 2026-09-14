import { describe, it, expect } from 'vitest';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateLoginUsername,
  validateLoginPassword,
} from './validation';

describe('validateUsername', () => {
  it('rejects empty usernames', () => {
    expect(validateUsername('').valid).toBe(false);
  });

  it('rejects usernames shorter than 3 characters', () => {
    expect(validateUsername('ab').valid).toBe(false);
  });

  it('rejects usernames longer than 30 characters', () => {
    expect(validateUsername('a'.repeat(31)).valid).toBe(false);
  });

  it('rejects usernames with invalid characters', () => {
    expect(validateUsername('user-name').valid).toBe(false);
  });

  it('accepts valid usernames', () => {
    expect(validateUsername('user_123').valid).toBe(true);
  });
});

describe('validateEmail', () => {
  it('rejects empty emails', () => {
    expect(validateEmail('').valid).toBe(false);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('not-an-email').valid).toBe(false);
  });

  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
  });
});

describe('validatePassword', () => {
  it('rejects empty passwords', () => {
    expect(validatePassword('').valid).toBe(false);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePassword('Abc1').valid).toBe(false);
  });

  it('rejects passwords without uppercase', () => {
    expect(validatePassword('password1').valid).toBe(false);
  });

  it('rejects passwords without lowercase', () => {
    expect(validatePassword('PASSWORD1').valid).toBe(false);
  });

  it('rejects passwords without numbers', () => {
    expect(validatePassword('Password').valid).toBe(false);
  });

  it('accepts valid passwords', () => {
    expect(validatePassword('Password123').valid).toBe(true);
  });
});

describe('validateConfirmPassword', () => {
  it('rejects empty confirmation', () => {
    expect(validateConfirmPassword('Password123', '').valid).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    expect(validateConfirmPassword('Password123', 'Password12').valid).toBe(false);
  });

  it('accepts matching passwords', () => {
    expect(validateConfirmPassword('Password123', 'Password123').valid).toBe(true);
  });
});

describe('login validators', () => {
  it('validateLoginUsername rejects empty values', () => {
    expect(validateLoginUsername('').valid).toBe(false);
  });

  it('validateLoginUsername accepts any non-empty value', () => {
    expect(validateLoginUsername('u').valid).toBe(true);
  });

  it('validateLoginPassword rejects empty values', () => {
    expect(validateLoginPassword('').valid).toBe(false);
  });

  it('validateLoginPassword accepts any non-empty value', () => {
    expect(validateLoginPassword('x').valid).toBe(true);
  });
});
