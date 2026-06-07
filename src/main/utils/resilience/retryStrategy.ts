import { sleep } from '../helpers';
import logger from '../logger';

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
  retryableErrors?: string[];
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 50,
  maxDelayMs: 2000,
  jitterFactor: 0.3,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ERR_CLOSED'],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isRetryable = shouldRetry(lastError, opts.retryableErrors);

      if (attempt < opts.maxRetries && isRetryable) {
        const delay = calculateDelay(attempt, opts);
        logger.warn('Retrying operation', { attempt: attempt + 1, delayMs: delay, error: lastError.message });
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  throw lastError;
}

function shouldRetry(error: Error, retryableErrors?: string[]): boolean {
  if (!retryableErrors || retryableErrors.length === 0) return true;
  return retryableErrors.some(
    (code) => error.message.includes(code) || (error as NodeJS.ErrnoException).code === code
  );
}

function calculateDelay(attempt: number, opts: RetryOptions): number {
  const exponential = opts.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, opts.maxDelayMs);
  const jitter = capped * opts.jitterFactor * Math.random();
  return Math.floor(capped + jitter);
}

export default withRetry;
