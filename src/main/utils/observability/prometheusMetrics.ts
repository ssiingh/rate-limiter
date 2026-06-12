import client from 'prom-client';
import { METRICS } from '../constants';

// Enable default Node.js metrics (CPU, memory, GC, event loop)
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Request counter
export const requestsTotal = new client.Counter({
  name: METRICS.REQUESTS_TOTAL,
  help: 'Total rate limit check requests',
  labelNames: ['algorithm', 'tenant'],
  registers: [register],
});

// Allowed counter
export const requestsAllowed = new client.Counter({
  name: METRICS.REQUESTS_ALLOWED,
  help: 'Total allowed requests',
  labelNames: ['algorithm', 'tenant'],
  registers: [register],
});

// Rejected counter
export const requestsRejected = new client.Counter({
  name: METRICS.REQUESTS_REJECTED,
  help: 'Total rejected (rate-limited) requests',
  labelNames: ['algorithm', 'tenant'],
  registers: [register],
});

// Latency histogram (P50/P95/P99)
export const requestDuration = new client.Histogram({
  name: METRICS.REQUEST_DURATION,
  help: 'Rate limit check latency in seconds',
  labelNames: ['algorithm'],
  buckets: [0.0001, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// Active keys gauge
export const activeKeys = new client.Gauge({
  name: METRICS.ACTIVE_KEYS,
  help: 'Number of active rate limit keys in Redis',
  registers: [register],
});

// Redis errors counter
export const redisErrors = new client.Counter({
  name: METRICS.REDIS_ERRORS,
  help: 'Total Redis operation errors',
  labelNames: ['operation'],
  registers: [register],
});

// Circuit breaker state gauge
export const circuitBreakerState = new client.Gauge({
  name: METRICS.CIRCUIT_STATE,
  help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  labelNames: ['name'],
  registers: [register],
});

// Adaptive adjustments counter
export const adaptiveAdjustments = new client.Counter({
  name: METRICS.ADAPTIVE_ADJUSTMENTS,
  help: 'Total adaptive rate limit adjustments made',
  labelNames: ['signal', 'algorithm'],
  registers: [register],
});

export async function getMetricsString(): Promise<string> {
  return register.metrics();
}

export { register };
export default register;
