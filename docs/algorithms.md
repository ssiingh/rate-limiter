# Rate Limiting Algorithms

This system supports five distinct rate-limiting algorithms, each suited for different use cases.

## 1. Token Bucket
- **Use Case:** Best for typical web APIs; allows short bursts of traffic.
- **How it works:** Tokens are added to the bucket at a fixed rate. Each request consumes a token. If the bucket is empty, requests are rejected.
- **Pros:** Allows bursts. Memory efficient.

## 2. Sliding Window Log / Counter
- **Use Case:** Strict API limits where bursts are not allowed (e.g., SMS sending APIs).
- **How it works:** Tracks timestamps of requests (or buckets them into smaller sub-windows). 
- **Pros:** Perfect accuracy. No edge-case bursts like Fixed Window.

## 3. Fixed Window
- **Use Case:** Simple quotas (e.g., 10,000 requests per day).
- **How it works:** Counters are reset at the boundary of the window (e.g., exactly at midnight).
- **Pros:** Minimal memory footprint.
- **Cons:** Spike problem at the window boundary (2x traffic possible).

## 4. Leaky Bucket
- **Use Case:** Traffic shaping and queueing. Processing background jobs at a steady rate.
- **How it works:** Requests enter a queue (bucket). They "leak" (are processed) at a constant rate.
- **Pros:** Smooths out traffic spikes completely.

## 5. Composite Combiner
- **Use Case:** Multi-dimensional limits.
- **Example:** Limit a user to 5 requests per second (Sliding Window) AND 10,000 requests per day (Fixed Window).
- **How it works:** Evaluates multiple limiters simultaneously and combines results using AND / OR / PRIORITY logic.
