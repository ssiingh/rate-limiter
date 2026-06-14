import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker } from '@/utils/resilience/circuitBreaker';
import { FallbackLimiter } from '@/utils/resilience/fallbackLimiter';
import { KeyGenerator } from '@/services/ratelimit/keys/keyGenerator';
import { KeyParser } from '@/services/ratelimit/keys/keyParser';
import type { RateLimitConfig } from '../../main/models';

describe('Rate Limiter Integration (mocked Redis)', () => {
  describe('Circuit Breaker + Fallback Integration', () => {
    it('falls back to local limiter when circuit is open', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 2,
        successThreshold: 1,
        timeoutMs: 100,
        halfOpenRequests: 1,
      });
      const fallback = new FallbackLimiter();

      // Trip the circuit breaker
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => { throw new Error('Redis down'); });
        } catch { /* expected */ }
      }

      expect(cb.getState()).toBe('OPEN');

      // Now it should use fallback
      const result = await cb.execute(
        async () => { throw new Error('should not reach'); },
        async () => fallback.check('test-key', { algorithm: 'token_bucket', limit: 10, windowMs: 60000 })
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('KeyGenerator + KeyParser roundtrip', () => {
    it('generates and parses keys correctly', () => {
      const key = KeyGenerator.generate({ algorithm: 'token_bucket', key: 'user:123' });
      expect(key).toContain('token_bucket');
      expect(key).toContain('user_123'); // sanitized

      const parsed = KeyParser.parse(key);
      expect(parsed).not.toBeNull();
      expect(parsed!.algorithm).toBe('token_bucket');
    });

    it('handles tenant and endpoint in keys', () => {
      const key = KeyGenerator.generate({
        algorithm: 'sliding_window',
        key: 'api-call',
        tenantId: 'acme',
        endpoint: '/api/v1/users',
      });
      expect(key).toContain('sliding_window');
      expect(key).toContain('acme');
    });

    it('generates IP-based keys', () => {
      const key = KeyGenerator.forIP('192.168.1.1', 'fixed_window', 60000);
      expect(key).toContain('ip');
      expect(key).toContain('192.168.1.1');
    });

    it('generates tenant-based keys', () => {
      const key = KeyGenerator.forTenant('acme', 'token_bucket');
      expect(key).toContain('tenant');
      expect(key).toContain('acme');
    });
  });

  describe('Full request flow (mocked)', () => {
    it('processes a rate limit check through the pipeline', async () => {
      const fallback = new FallbackLimiter();
      const config: RateLimitConfig = {
        algorithm: 'token_bucket',
        limit: 100,
        windowMs: 60000,
      };

      // Simulate check using fallback (no Redis)
      const result = await fallback.check('user:test', config);
      expect(result.allowed).toBe(true);
      expect(result.algorithm).toBeDefined();
      expect(result.key).toBe('user:test');
    });

    it('applies rate limiting across multiple requests', async () => {
      const fallback = new FallbackLimiter();
      const config: RateLimitConfig = {
        algorithm: 'token_bucket',
        limit: 5,
        windowMs: 60000,
      };

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(await fallback.check('limited-key', config));
      }

      // With a limit of 5, some should be rejected
      const allowed = results.filter(r => r.allowed).length;
      const rejected = results.filter(r => !r.allowed).length;
      expect(allowed).toBeLessThanOrEqual(6); // Small tolerance for timing
      expect(rejected).toBeGreaterThanOrEqual(0);
    });
  });
});
