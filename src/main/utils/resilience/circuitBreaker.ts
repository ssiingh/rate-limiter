import { CIRCUIT_STATES } from '../constants';
import logger from '../logger';

type CircuitState = typeof CIRCUIT_STATES[keyof typeof CIRCUIT_STATES];

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  halfOpenRequests: number;
}

export class CircuitBreaker {
  private state: CircuitState = CIRCUIT_STATES.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private halfOpenAttempts = 0;

  constructor(
    private readonly name: string,
    private readonly opts: CircuitBreakerOptions = {
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      successThreshold: 2,
      timeoutMs: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS || '30000', 10),
      halfOpenRequests: parseInt(process.env.CIRCUIT_BREAKER_HALF_OPEN_REQUESTS || '3', 10),
    }
  ) {}

  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CIRCUIT_STATES.HALF_OPEN);
      } else {
        if (fallback) return fallback();
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.opts.halfOpenRequests) {
        if (fallback) return fallback();
        throw new Error(`Circuit breaker [${this.name}] HALF_OPEN limit reached`);
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.opts.successThreshold) {
        this.transitionTo(CIRCUIT_STATES.CLOSED);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (
      this.state === CIRCUIT_STATES.CLOSED &&
      this.failureCount >= this.opts.failureThreshold
    ) {
      this.transitionTo(CIRCUIT_STATES.OPEN);
    } else if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.transitionTo(CIRCUIT_STATES.OPEN);
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.opts.timeoutMs
    );
  }

  private transitionTo(newState: CircuitState): void {
    logger.warn(`Circuit breaker [${this.name}]: ${this.state} → ${newState}`);
    this.state = newState;
    if (newState === CIRCUIT_STATES.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    }
    if (newState === CIRCUIT_STATES.HALF_OPEN) {
      this.halfOpenAttempts = 0;
      this.successCount = 0;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export default CircuitBreaker;
