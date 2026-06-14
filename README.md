<div align="center">

# 🚀 Rate Limiter

**High-performance, Redis-backed rate limiter service with multiple algorithms and REST API**
</div>

## 🎯 Overview

A production-ready distributed rate limiter supporting **five algorithms** (Token Bucket, Sliding Window, Fixed Window, Leaky Bucket, and Composite) with Redis backing for high-performance API protection. Perfect for microservices, SaaS platforms, and any application requiring sophisticated rate limiting with algorithm flexibility, multi-dimensional limits, and traffic shaping capabilities.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🏃 **High Performance** | 50,000+ requests/second with <2ms latency |
| 🎯 **Five Algorithms** | Token Bucket, Sliding Window, Fixed Window, Leaky Bucket, Composite |
| 🌍 **Geo Limiting** | Country-level limits with Cloudflare/CloudFront CDN header support |
| 🌐 **Distributed** | Redis-backed atomic Lua scripts for multi-instance safety |
| ⚡ **Production Ready** | Circuit breaker, fallback limiter, Prometheus metrics |
| 🛡️ **Thread Safe** | Atomic Redis operations — no race conditions |
| 🧪 **Tested** | Vitest unit + integration + load test suites |
| 🐳 **Container Ready** | Multi-stage Dockerfile + Docker Compose |

---
## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (20+ recommended)
- npm (or pnpm)
- Redis running locally on port 6379


### Development

```bash
npm install
cp .env.example .env
npm run dev
```

The backend will start on `http://localhost:3000`

### Testing

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage # With coverage
```

## Building

```bash
npm run build
npm start
```

---

## 📡 API Reference

*(See the [Docs](docs/) for more extensive documentation)*

### Rate Limit Check
```http
POST /rate-limit/check
Content-Type: application/json

{
  "key": "user:12345",
  "algorithm": "token_bucket",
  "limit": 100,
  "windowMs": 60000
}
```

**Response:**
```json
{
  "allowed": true,
  "remaining": 99,
  "limit": 100,
  "resetMs": 1736000000000,
  "algorithm": "token_bucket",
  "key": "user:12345",
  "latencyMs": 1
}
```

### Health Check
```http
GET /health           # Full health status
GET /health/live      # Liveness probe
GET /health/ready     # Readiness probe
```

### Metrics
```http
GET /metrics          # Prometheus text format
GET /metrics/json     # JSON snapshot
```

### Admin (requires X-Admin-Key header)
```http
GET    /admin/limits           # List all overrides
POST   /admin/limits           # Set a limit override
DELETE /admin/limits/:key      # Remove an override
```

### Benchmark
```http
POST /benchmark/run
{
  "scenario": "sustained",
  "concurrency": 50,
  "durationMs": 10000,
  "algorithm": "sliding_window"
}
```

---

## 📊 Response Headers

Every rate-limited response includes:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed |
| `X-RateLimit-Remaining` | Requests remaining in window |
| `X-RateLimit-Reset` | Unix timestamp of window reset |
| `X-RateLimit-Algorithm` | Algorithm used |
| `Retry-After` | Seconds until retry (on 429) |
| `X-Correlation-ID` | Request correlation ID |

---

## 🔧 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `DEFAULT_ALGORITHM` | `token_bucket` | Default algorithm |
| `DEFAULT_RATE_LIMIT` | `100` | Default request limit |
| `DEFAULT_WINDOW_MS` | `60000` | Default window size (ms) |
| `ADAPTIVE_ENABLED` | `true` | Enable ML adaptation |
| `GEO_ENABLED` | `true` | Enable geo limiting |
| `CIRCUIT_BREAKER_THRESHOLD` | `5` | Failures before opening |
| `PORT` | `3000` | Server port |

---

## 🐳 Docker

```bash
# Standard Docker deployment
docker-compose -f docker/docker-compose.yml up -d

# Redis cluster (6-node: 3 masters + 3 replicas)
docker-compose -f docker/docker-compose.redis-cluster.yml up -d

# Build image only
docker build -f docker/Dockerfile -t ratelimiter-{env}:latest .
```

---
