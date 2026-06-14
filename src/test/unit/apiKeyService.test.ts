import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker } from '@/utils/resilience/circuitBreaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker('test', {
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 100,
      halfOpenRequests: 2,
    });
  });

  it('allows requests in CLOSED state', async () => {
    const result = await cb.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('opens after failure threshold reached', async () => {
    const failing = () => Promise.reject(new Error('Redis error'));
    for (let i = 0; i < 3; i++) {
      try { await cb.execute(failing); } catch {}
    }
    expect(cb.getState()).toBe('OPEN');
  });

  it('uses fallback when OPEN', async () => {
    const failing = () => Promise.reject(new Error('fail'));
    for (let i = 0; i < 3; i++) {
      try { await cb.execute(failing); } catch {}
    }
    const result = await cb.execute(
      () => Promise.reject(new Error('fail')),
      () => Promise.resolve('fallback')
    );
    expect(result).toBe('fallback');
  });

  it('transitions to HALF_OPEN after timeout', async () => {
    const failing = () => Promise.reject(new Error('fail'));
    for (let i = 0; i < 3; i++) {
      try { await cb.execute(failing); } catch {}
    }
    expect(cb.getState()).toBe('OPEN');
    await new Promise((r) => setTimeout(r, 150));
    // Next execute should move to HALF_OPEN
    try {
      await cb.execute(() => Promise.resolve('ok'));
    } catch {}
    expect(['HALF_OPEN', 'CLOSED']).toContain(cb.getState());
  });
});
