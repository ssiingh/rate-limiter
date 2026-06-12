import logger from '../logger';

export interface RequestLogEntry {
  correlationId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip?: string;
  userAgent?: string;
  algorithm?: string;
  allowed?: boolean;
  rateLimitKey?: string;
  timestamp: string;
}

/**
 * Structured request logger for rate limiter operations.
 * Produces machine-parseable log entries for observability pipelines.
 */
export class RequestLogger {
  private static instance: RequestLogger;

  static getInstance(): RequestLogger {
    if (!RequestLogger.instance) {
      RequestLogger.instance = new RequestLogger();
    }
    return RequestLogger.instance;
  }

  /**
   * Log a rate limit check event.
   */
  logRateLimitCheck(entry: Omit<RequestLogEntry, 'timestamp'>): void {
    const fullEntry: RequestLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    logger.info('rate_limit_check', fullEntry);
  }

  /**
   * Log an admin operation.
   */
  logAdminOperation(operation: string, details: Record<string, unknown>): void {
    logger.info('admin_operation', {
      operation,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log a security event (blocked IP, invalid API key, etc.).
   */
  logSecurityEvent(event: string, details: Record<string, unknown>): void {
    logger.warn('security_event', {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log an adaptive signal change.
   */
  logAdaptiveSignal(key: string, signal: string, details: Record<string, unknown>): void {
    logger.info('adaptive_signal', {
      key,
      signal,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }
}

export default RequestLogger;
