import { describe, it, expect } from 'vitest';
import { validate, RateLimitRequestSchema, AdminLimitSchema } from '../../main/utils/validation';

describe('Validation Schemas', () => {
  describe('RateLimitRequestSchema', () => {
    it('validates a valid request', () => {
      const input = { key: 'user:123', algorithm: 'token_bucket', limit: 100, windowMs: 60000 };
      const result = validate(RateLimitRequestSchema, input);
      expect(result.key).toBe('user:123');
    });

    it('throws on empty key', () => {
      expect(() => validate(RateLimitRequestSchema, { key: '' })).toThrow();
    });

    it('throws on invalid algorithm', () => {
      expect(() =>
        validate(RateLimitRequestSchema, { key: 'test', algorithm: 'unknownAlgo' })
      ).toThrow();
    });

    it('throws on negative limit', () => {
      expect(() =>
        validate(RateLimitRequestSchema, { key: 'test', limit: -1 })
      ).toThrow();
    });
  });

  describe('AdminLimitSchema', () => {
    it('validates a valid admin limit', () => {
      const input = { key: 'tenant:xyz', limit: 1000, windowMs: 60000, algorithm: 'sliding_window' };
      const result = validate(AdminLimitSchema, input);
      expect(result.limit).toBe(1000);
    });
  });
});
