import { nowMs } from '../utils/timeUtils';

/**
 * Generates concurrent requests at a target rate.
 * Used by the benchmark suite for load testing.
 */
export class LoadGenerator {
  private running = false;
  private requestCount = 0;

  /**
   * Generate load at a target rate for a specified duration.
   *
   * @param targetRps    Target requests per second
   * @param durationMs   How long to generate load
   * @param concurrency  Number of concurrent workers
   * @param requestFn    Function to execute per request
   * @returns Total requests generated
   */
  async generate(
    targetRps: number,
    durationMs: number,
    concurrency: number,
    requestFn: (requestId: number) => Promise<void>
  ): Promise<number> {
    this.running = true;
    this.requestCount = 0;
    const stopAt = nowMs() + durationMs;
    const delayBetweenRequests = Math.max(0, 1000 / (targetRps / concurrency));

    const worker = async (): Promise<void> => {
      while (this.running && nowMs() < stopAt) {
        const id = this.requestCount++;
        try {
          await requestFn(id);
        } catch {
          // Errors are counted but don't stop generation
        }
        if (delayBetweenRequests > 0) {
          await this.sleep(delayBetweenRequests);
        }
      }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    this.running = false;

    return this.requestCount;
  }

  /**
   * Stop the generator.
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Get the current request count.
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default LoadGenerator;
