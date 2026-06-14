# Node.js Client Example

This example demonstrates how to integrate the Rate Limiter with Node.js applications.

## Dependencies

```bash
npm install axios express
# or with fetch (Node 18+)
# No additional dependencies needed
```

## Simple Client

```typescript
interface RateLimitRequest {
    key: string;
    tokens: number;
    apiKey?: string;
}

interface RateLimitResponse {
    key: string;
    tokensRequested: number;
    allowed: boolean;
}

interface RateLimitResult {
    allowed: boolean;
    key: string;
    tokensRequested: number;
}

class TypedRateLimiterClient {
    private baseUrl: string;
    private apiKey?: string;

    constructor(baseUrl: string = 'http://localhost:3000', apiKey?: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
    }

    async checkRateLimit(key: string, tokens: number = 1): Promise<RateLimitResult> {
        const payload: RateLimitRequest = {
            key,
            tokens
        };

        if (this.apiKey) {
            payload.apiKey = this.apiKey;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/ratelimit/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok || response.status === 429) {
                const data: RateLimitResponse = await response.json();
                return {
                    allowed: data.allowed,
                    key: data.key,
                    tokensRequested: data.tokensRequested
                };
            } else if (response.status === 401) {
                throw new Error('Invalid API key');
            } else if (response.status === 403) {
                throw new Error('IP address not allowed');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.warn(`Rate limiter error: ${error}, allowing request`);
            
            return {
                allowed: true,
                key,
                tokensRequested: tokens
            };
        }
    }
}

export { TypedRateLimiterClient, RateLimitRequest, RateLimitResponse, RateLimitResult };
```

## Algorithm Configuration

Configure different algorithms for optimal performance:

```javascript
const axios = require('axios');

class RateLimiterConfigService {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
    }
    
    async configureAlgorithms() {
        // Token Bucket for user endpoints - allows bursts
        await this.configurePattern('user:*', {
            capacity: 50,
            refillRate: 10,
            algorithm: 'TOKEN_BUCKET'
        });
        
        // Sliding Window for API endpoints - precise control
        await this.configurePattern('api:*', {
            capacity: 100,
            refillRate: 20,
            algorithm: 'SLIDING_WINDOW'
        });
        
        // Fixed Window for bulk operations - memory efficient  
        await this.configurePattern('bulk:*', {
            capacity: 1000,
            refillRate: 100,
            algorithm: 'FIXED_WINDOW'
        });
    }
    
    async configurePattern(pattern, config) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/ratelimit/config/patterns/${encodeURIComponent(pattern)}`,
                config,
                { timeout: 10000 }
            );
            
            if (response.status === 200) {
                console.log(`Configured pattern ${pattern} with ${config.algorithm}`);
            }
        } catch (error) {
            console.error(`Failed to configure pattern ${pattern}:`, error.message);
        }
    }
}

// Algorithm selection helper
function selectAlgorithm(endpointType) {
    const algorithmMap = {
        'user_facing': 'TOKEN_BUCKET',    // Better UX with burst handling
        'critical_api': 'SLIDING_WINDOW', // Precise rate control
        'bulk_operation': 'FIXED_WINDOW', // Memory efficient
        'default': 'TOKEN_BUCKET'         // Safe default
    };
    
    return algorithmMap[endpointType] || algorithmMap.default;
}

// Usage
const configService = new RateLimiterConfigService();
configService.configureAlgorithms()
    .then(() => console.log('Algorithm configuration complete'))
    .catch(err => console.error('Configuration failed:', err));

module.exports = { RateLimiterConfigService, selectAlgorithm };
```

## Configuration

Environment variables:

```javascript
// config.js
module.exports = {
    rateLimiter: {
        url: process.env.RATE_LIMITER_URL || 'http://localhost:3000',
        apiKey: process.env.RATE_LIMITER_API_KEY,
        timeout: parseInt(process.env.RATE_LIMITER_TIMEOUT || '10000'),
        failOpen: process.env.RATE_LIMITER_FAIL_OPEN !== 'false'
    }
};
```

## Resilient Client with Retry

```javascript
class ResilientRateLimiterClient extends RateLimiterClient {
    constructor(baseUrl, apiKey, options = {}) {
        super(baseUrl, apiKey);
        this.maxRetries = options.maxRetries || 3;
        this.failOpen = options.failOpen !== false;
        this.retryDelay = options.retryDelay || 1000;
    }

    async checkRateLimit(key, tokens = 1) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await super.checkRateLimit(key, tokens);
                return result;
            } catch (error) {
                lastError = error;
                
                if (attempt < this.maxRetries) {
                    const delay = this.retryDelay * Math.pow(2, attempt);
                    console.warn(`Rate limiter attempt ${attempt + 1} failed, retrying in ${delay}ms`);
                    await this.sleep(delay);
                }
            }
        }
        
        console.error(`All rate limiter attempts failed: ${lastError.message}`);
        
        if (this.failOpen) {
            console.warn('Failing open - allowing request');
            return {
                allowed: true,
                key,
                tokensRequested: tokens
            };
        } else {
            throw lastError;
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```