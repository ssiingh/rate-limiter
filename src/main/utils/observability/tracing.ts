/**
 * OpenTelemetry-compatible tracing setup.
 * Provides span creation and context propagation for distributed tracing.
 */

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  name: string;
  attributes: Record<string, string | number | boolean>;
  status: 'OK' | 'ERROR' | 'UNSET';
}

/**
 * Simple tracing implementation for rate limiter operations.
 * In production, replace with OpenTelemetry SDK.
 */
export class Tracer {
  private static instance: Tracer;
  private spans: SpanContext[] = [];
  private readonly maxSpans: number;
  private readonly enabled: boolean;

  private constructor(maxSpans = 10_000) {
    this.maxSpans = maxSpans;
    this.enabled = process.env.TRACING_ENABLED !== 'false';
  }

  static getInstance(): Tracer {
    if (!Tracer.instance) {
      Tracer.instance = new Tracer();
    }
    return Tracer.instance;
  }

  /**
   * Start a new span.
   */
  startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): SpanContext {
    const span: SpanContext = {
      traceId: this.generateId(),
      spanId: this.generateId(),
      startTime: Date.now(),
      name,
      attributes,
      status: 'UNSET',
    };

    if (this.enabled) {
      this.spans.push(span);
      if (this.spans.length > this.maxSpans) {
        this.spans = this.spans.slice(-this.maxSpans);
      }
    }

    return span;
  }

  /**
   * End a span with a status.
   */
  endSpan(span: SpanContext, status: 'OK' | 'ERROR' = 'OK'): void {
    span.endTime = Date.now();
    span.status = status;
  }

  /**
   * Create a child span.
   */
  startChildSpan(
    parent: SpanContext,
    name: string,
    attributes: Record<string, string | number | boolean> = {}
  ): SpanContext {
    const child = this.startSpan(name, attributes);
    child.traceId = parent.traceId;
    child.parentSpanId = parent.spanId;
    return child;
  }

  /**
   * Get recent spans, optionally filtered by name.
   */
  getSpans(limit = 100, nameFilter?: string): SpanContext[] {
    let filtered = this.spans;
    if (nameFilter) {
      filtered = filtered.filter((s) => s.name.includes(nameFilter));
    }
    return filtered.slice(-limit);
  }

  /**
   * Convenience: trace an async function.
   */
  async trace<T>(
    name: string,
    fn: (span: SpanContext) => Promise<T>,
    attributes: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    try {
      const result = await fn(span);
      this.endSpan(span, 'OK');
      return result;
    } catch (error) {
      this.endSpan(span, 'ERROR');
      throw error;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 18);
  }
}

export default Tracer;
