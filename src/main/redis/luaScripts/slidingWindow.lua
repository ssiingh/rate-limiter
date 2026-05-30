-- Sliding Window Rate Limiter Lua Script (using sorted sets)
-- KEYS[1] = sorted set key
-- ARGV[1] = window size in milliseconds
-- ARGV[2] = max requests allowed
-- ARGV[3] = current timestamp (milliseconds)
-- ARGV[4] = unique request ID

local key = KEYS[1]
local window_ms = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now_ms = tonumber(ARGV[3])
local request_id = ARGV[4]
local window_start = now_ms - window_ms

-- Remove entries outside the window
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Count current requests in window
local current_count = redis.call('ZCARD', key)

local allowed = 0
local remaining = 0

if current_count < limit then
  -- Add current request
  redis.call('ZADD', key, now_ms, request_id .. ':' .. now_ms)
  allowed = 1
  remaining = limit - current_count - 1
else
  remaining = 0
end

-- Set TTL slightly longer than window
local ttl_seconds = math.ceil(window_ms / 1000) + 1
redis.call('EXPIRE', key, ttl_seconds)

-- Calculate reset time: when oldest entry will fall out of window
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local reset_ms = now_ms + window_ms
if #oldest > 0 then
  reset_ms = tonumber(oldest[2]) + window_ms
end

return {allowed, remaining, reset_ms, limit}
