-- tokenBucket.lua implementation based on ADR-002
local key = KEYS[1]
local tokensToConsume = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refillRate = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefillTime')
local tokens = tonumber(bucket[1]) or capacity
local lastRefillTime = tonumber(bucket[2]) or now

-- Calculate refill
local timePassed = now - lastRefillTime
local tokensToAdd = math.floor((timePassed * refillRate) / 1000)
tokens = math.min(capacity, tokens + tokensToAdd)

-- Try to consume
local allowed = 0
if tokens >= tokensToConsume then
    tokens = tokens - tokensToConsume
    allowed = 1
end

-- Update bucket state
redis.call('HMSET', key, 'tokens', tokens, 'lastRefillTime', now, 'capacity', capacity, 'refillRate', refillRate)
redis.call('EXPIRE', key, 3600)

-- API compatibility: return {allowed and 1 or 0, tokens, resetMs, capacity}
-- Calculate reset time (when the bucket will be completely full)
local reset_ms = now + math.ceil((capacity - tokens) / refillRate) * 1000

return {allowed, math.floor(tokens), reset_ms, capacity}
