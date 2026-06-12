/**
 * Get current timestamp in milliseconds
 */
export const nowMs = (): number => Date.now();

/**
 * Get current timestamp in seconds
 */
export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

/**
 * Get the start of the current fixed window (epoch aligned)
 * @param windowMs - window size in milliseconds
 */
export function getWindowStart(windowMs: number): number {
  return Math.floor(Date.now() / windowMs) * windowMs;
}

/**
 * Get the end of the current fixed window
 */
export function getWindowEnd(windowMs: number): number {
  return getWindowStart(windowMs) + windowMs;
}

/**
 * Get TTL (in seconds) until next window reset
 */
export function getWindowTTL(windowMs: number): number {
  return Math.ceil((getWindowEnd(windowMs) - Date.now()) / 1000);
}

/**
 * Convert milliseconds to seconds (ceiling)
 */
export const msToSeconds = (ms: number): number => Math.ceil(ms / 1000);

/**
 * Format Unix timestamp to ISO string
 */
export const toISOString = (unixMs: number): string =>
  new Date(unixMs).toISOString();

/**
 * Calculate elapsed seconds since a timestamp (in seconds)
 */
export const elapsedSeconds = (sinceSeconds: number): number =>
  nowSeconds() - sinceSeconds;

/**
 * Round to N decimal places
 */
export const round = (value: number, decimals: number = 3): number =>
  Math.round(value * 10 ** decimals) / 10 ** decimals;

/**
 * Format duration as human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

/**
 * Get sliding window bucket key suffix for sub-window precision
 */
export function getSlidingWindowBucket(windowMs: number, buckets: number): number {
  const bucketSize = windowMs / buckets;
  return Math.floor(Date.now() / bucketSize);
}
