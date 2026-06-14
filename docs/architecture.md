# Architecture Overview

The Rate Limiter is designed as a high-performance, distributed, and resilient system for API protection and traffic shaping.

## System Components

```mermaid
graph TD
    Client[Client Requests] --> Router[Express Router / Middleware]
    Router --> Orchestrator[RateLimiter Orchestrator]
    
    subgraph Core Rate Limiting
        Orchestrator --> Factory[Algorithm Factory]
        Factory --> TokenBucket[Token Bucket]
        Factory --> SlidingWindow[Sliding Window]
        Factory --> Combiner[Composite Combiner]
    end

    subgraph Resilience
        Orchestrator --> CircuitBreaker[Circuit Breaker]
        CircuitBreaker --"On Failure"--> Fallback[Fallback In-Memory Limiter]
    end

    subgraph Storage
        TokenBucket --> Redis[(Redis)]
        SlidingWindow --> Redis
    end

    subgraph Observability & Adaptive
        Orchestrator --> Metrics[Metrics Service]
        Orchestrator --> ML[Traffic Pattern Analyzer]
        ML --"Adjust Limits"--> ConfigManager[Configuration Service]
    end
```

## Resilience Design
The system uses a **Fail-Open strategy**. If Redis goes down, the `CircuitBreaker` trips, and the `FallbackLimiter` takes over using an LRU in-memory cache. This ensures the rate limiter never becomes a single point of failure that brings down your API.
