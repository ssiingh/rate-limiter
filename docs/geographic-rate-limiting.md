# Geographic Rate Limiting

This document explains how the geographic rate limiter works in this project, how the middleware is wired into the application, and how to configure and extend it for production use.

## Overview

The geographic rate limiter is a request gate that evaluates the client’s origin before the request reaches the main rate-limiting logic. Its purpose is to enforce regional access policies such as:

- blocking traffic from countries or regions that are not allowed
- allowing only a whitelist of countries
- using CDN or proxy headers when available to infer the client’s country
- preparing compliance-aware policies for regions such as GDPR or CCPA

In this codebase, geo-limiting is implemented as a middleware layer that runs early in the request lifecycle.

## Why Geo Limiting Matters

Geo limiting is useful when you need to:

- block traffic from high-risk or unsupported regions
- comply with local laws and privacy regulations
- reduce abuse from specific countries
- apply different policies depending on traffic origin
- protect APIs from being used in regions where your service is not intended to operate

It is especially useful in distributed systems where requests arrive from many locations and a single global policy is insufficient.

## Where It Fits in the Application

The middleware is registered globally in the Express app before the routes are mounted. This ensures that every incoming request is evaluated before it reaches the rate limiter or route handlers.

### Request Flow

1. A request arrives at the Express server.
2. The request context middleware runs.
3. The geo limiter middleware evaluates the request.
4. If the request is blocked, the middleware returns a `403 Forbidden` response.
5. If the request is allowed, it continues to the normal route handlers.

This gives geo limiting a strong “early rejection” role.

## Core Components

The geographic limiter is built from several components:

### 1. Geo Limiter Middleware

The middleware is implemented in `geoLimiterMiddleware.ts`.

It:

- extracts the client IP
- asks the geo limiter service whether the request should be blocked
- logs the event when a request is denied
- returns a structured JSON response with the reason and country when blocked

### 2. Geo Limiter Service

The main decision logic is implemented in `geoLimiter.ts`.

It evaluates three core conditions:

- whether geo limiting is enabled at all
- whether the detected country is in the blocked country list
- whether the request is outside an allowlist if one is configured

### 3. Geo Resolver

The resolver is implemented in `geoResolver.ts`.

It determines the client’s location using the following strategy:

1. CDN headers such as `CF-IPCountry` or `CloudFront-Viewer-Country` are checked first
2. The result is cached for reuse
3. If no CDN header is available, the request falls back to a geo-IP lookup using `geoip-lite`

### 4. IP Extractor

The IP extractor is implemented in `ipAddressExtractor.ts`.

It tries to determine the real client IP from several sources, in order:

- `CF-Connecting-IP`
- `X-Forwarded-For`
- `X-Real-IP`
- the socket connection address

This is important because applications behind proxies or CDNs often receive requests through intermediate infrastructure.

### 5. Configuration Module

The settings are centralized in `geoConfig.ts`.

It loads values from environment variables and exposes them to the middleware and services.

### 6. Compliance Zone Service

The compliance zone service is implemented in `complianceZoneService.ts`.

It provides a foundation for region-based compliance handling, including:

- GDPR regions
- CCPA regions
- restricted regions such as CN, RU, KP, IR
- zone-based limit multipliers
- blocked-region handling

Although this service exists, the current middleware path mainly uses the simpler country allow/block checks.

## How the Middleware Works

### Step 1: Extract the Client IP

The middleware calls the IP extractor to determine the client address. This is necessary because the request is often forwarded by a CDN, reverse proxy, or load balancer.

### Step 2: Resolve the Geographic Location

The geo resolver tries to infer the originating country.

The priority order is:

- CDN header-based lookup
- cached lookup
- geo-IP database lookup

### Step 3: Validate the Region

The geo limiter service checks:

- if the request source is in the blocked country list
- if the request source is outside the configured allowlist

If either condition is true, the request is rejected.

### Step 4: Continue or Reject

If the request passes the checks, the middleware calls `next()` and the request continues through the app.

If the request fails, the middleware responds with:

- HTTP status `403`
- an error message
- the detected country
- the reason for blocking

## Supported Configuration

The following environment variables are used by the geo limiter:

### Enable or Disable Geo Limiting

- `GEO_ENABLED=true|false`

When set to `false`, the middleware does not block requests and behaves as if geo limiting is disabled.

### Blocked Countries

- `GEO_BLOCKED_COUNTRIES=CN,RU,IR`

This accepts a comma-separated list of country codes. Requests from those countries are denied.

### Blocked Regions

- `GEO_BLOCKED_REGIONS=EU,APAC`

This is defined in the configuration layer and is meant for future or broader policy grouping.

### Allowed Countries

- `GEO_ALLOWED_COUNTRIES=US,CA,GB`

If this list is non-empty, only requests from these countries are allowed.

### Compliance Strictness

- `COMPLIANCE_STRICTNESS=lenient|standard|strict`

This controls how strict compliance handling should be in the policy layer.

### Custom CDN Header

- `GEO_CUSTOM_HEADER=my-custom-header`

This allows custom header support for environments that use a non-standard proxy/CDN header.

## Default Behavior

If no environment variables are configured, the system uses the following defaults:

- geo limiting is enabled only when `GEO_ENABLED=true`
- blocked countries list is empty by default
- allowed countries list is empty by default
- compliance strictness defaults to `standard`
- country-specific limits are initialized for example regions such as `US`, `EU`, and `CN`

## Country Limit Handling

The configuration module includes a `countryLimits` map. It is currently used as a policy scaffold for per-country rate-limit tuning.

In the current implementation, the actual middleware path primarily implements:

- country block checks
- allowlist checks

The `getLimitMultiplier()` method in the geo limiter returns `1.0` by default, which means there is no active per-country multiplier effect yet.

## CDN and Proxy Support

Because many real deployments sit behind reverse proxies or CDNs, the middleware is designed to work with forwarded headers.

### Common Headers Used

- `CF-IPCountry`
- `CloudFront-Viewer-Country`
- `CF-Connecting-IP`
- `X-Forwarded-For`
- `X-Real-IP`

This makes it suitable for deployments on platforms such as Cloudflare, AWS CloudFront, Nginx, and similar infrastructure.

## Compliance Awareness

The compliance zone service is a useful extension point for future policy enforcement.

It can support:

- GDPR restrictions for EU countries
- CCPA adjustments for California
- restricted-region handling for countries with greater regulatory constraints

This layer is not currently enforced directly in the middleware, but it is ready to be used for future expansion.

## Response Behavior

When a request is denied by the geo policy, the middleware returns a response like the following:

```json
{
  "error": "Forbidden",
  "message": "Access denied from your region",
  "country": "CN",
  "reason": "Country blocked"
}
```

The response status code is `403 Forbidden`.

## Logging and Observability

Geo-limited requests are logged with warning-level output. The log includes:

- the client IP
- the detected country
- the reason for denial

This helps operators diagnose policy violations and understand which regions are being blocked.

## Important Notes and Limitations

### 1. It is a Pre-Filter, Not the Main Rate Limiter

Geo limiting is a policy gate. It does not replace the token-bucket, sliding-window, or composite rate limiting algorithms. It runs before them and can deny requests early.

### 2. Geo IP Accuracy Depends on Context

The accuracy of country detection depends on:

- whether proxy headers are present
- whether the DNS/proxy setup is trusted
- whether the geo database can resolve the IP correctly

### 3. Header-Based Detection Can Be Spoofed

If the application trusts forwarded headers without proper proxy configuration, a client might manipulate them. The system should be deployed behind trusted infrastructure only.

### 4. The Current Implementation is Blocking-Oriented

The current middleware focuses on allow/block decisions. More advanced policy behavior such as regional rate multipliers is scaffolded but not fully wired into the main request path.

## Example Configuration

A typical production configuration might look like this:

```env
GEO_ENABLED=true
GEO_BLOCKED_COUNTRIES=CN,RU,IR
GEO_ALLOWED_COUNTRIES=US,CA,GB,DE,FR
COMPLIANCE_STRICTNESS=strict
GEO_CUSTOM_HEADER=CF-IPCountry
```

## Example Request Flow

### Allowed Request

If a request comes from a country that is not blocked and is part of the allowlist, the middleware calls `next()` and the request continues.

### Blocked Request

If a request comes from a blocked country, the middleware returns `403 Forbidden` immediately.

## Summary

The geographic rate limiter is a lightweight but important policy layer that protects the API from undesired regions before the main rate limiting logic runs. It combines:

- IP extraction
- proxy/CDN header awareness
- cached geo lookups
- allow/block policies
- compliance-oriented policy scaffolding

It is best viewed as an early-access control layer that complements the main distributed rate limiting system.
