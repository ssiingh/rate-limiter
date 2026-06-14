# Scaling Guide

The Adaptive Rate Limiter is fundamentally stateless at the Node.js application layer, making it trivial to scale horizontally. State is centralized in Redis.

## Application Tier
- Deploy as a fleet of containers (Docker / Kubernetes).
- Use a load balancer (NGINX, HAProxy, AWS ALB) to perfectly distribute traffic across nodes.
- Set up Kubernetes HPA (Horizontal Pod Autoscaler) based on CPU utilization or `requestsTotal` Prometheus metrics.

## Redis Tier
- **Single Node:** Good for up to ~100k OPS.
- **Redis Cluster:** Required for extreme scale. The rate limiter keys are explicitly designed to keep algorithm operations atomic. Note: Ensure composite limiters route keys to the same hash slot if Lua scripts need to touch multiple keys, though currently keys are evaluated independently in the application tier to avoid cross-slot errors in Lua.
- **Eviction:** Configure Redis with `volatile-lru` or `volatile-ttl` to automatically purge old rate limit keys.

## Fallback Tier
If scaling pressure brings Redis down, the `CircuitBreaker` will engage, shifting load to the local `FallbackLimiter`. Memory footprint per Node.js instance stays low due to LRU bounded caches.
