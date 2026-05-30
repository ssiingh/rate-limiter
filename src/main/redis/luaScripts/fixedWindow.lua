-- Fixed Window Rate Limiter Lua Script
-- KEYS[1] = counter key (includes window boundary in key)
-- ARGV[1] = max requests per window
-- ARGV[2] = window TTL in seconds
-- ARGV[3] = cost (number of tokens to consume, usually 1)

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl_seconds = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])

-- Atomic increment-and-check
local current = redis.call('INCRBY', key, cost)

-- Set expiry only on first increment (so window resets at epoch boundary)
if current == cost then
  redis.call('EXPIRE', key, ttl_seconds)
end

-- Get actual TTL for reset calculation
local ttl = redis.call('TTL', key)

local allowed = 0
local remaining = 0

if current <= limit then
  allowed = 1
  remaining = limit - current
else
  remaining = 0
end

return {allowed, remaining, ttl, limit}
