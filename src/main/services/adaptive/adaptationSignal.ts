/**
 * Adaptation signal types emitted by the traffic pattern analyzer.
 * Used to communicate between the anomaly detection engine and the rate limiter.
 */
export type AdaptationSignal = 'SCALE_UP' | 'SCALE_DOWN' | 'ALERT' | 'THROTTLE' | 'STABLE';

export interface SignalEvent {
  signal: AdaptationSignal;
  timestamp: number;
  key?: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a signal event with current timestamp.
 */
export function createSignalEvent(
  signal: AdaptationSignal,
  reason: string,
  key?: string,
  metadata?: Record<string, unknown>
): SignalEvent {
  return {
    signal,
    timestamp: Date.now(),
    key,
    reason,
    metadata,
  };
}

/**
 * Check whether a signal indicates a capacity adjustment is needed.
 */
export function isCapacitySignal(signal: AdaptationSignal): boolean {
  return signal === 'SCALE_UP' || signal === 'SCALE_DOWN' || signal === 'THROTTLE';
}
