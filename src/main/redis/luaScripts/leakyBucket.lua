-- Leaky Bucket Rate Limiter Lua Script
-- KEYS[1] = bucket state key
-- ARGV[1] = bucket capacity (max queue depth)
-- ARGV[2] = drain rate (requests per second)
-- ARGV[3] = current timestamp (milliseconds)
-- ARGV[4] = cost (requests to add)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local drain_rate = tonumber(ARGV[2])
local now_ms = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local state = redis.call('HMGET', key, 'queue', 'last_drain')
local queue = tonumber(state[1])
local last_drain = tonumber(state[2])

if queue == nil then
  queue = 0
  last_drain = now_ms
end

-- Drain the bucket based on elapsed time
local elapsed_seconds = (now_ms - last_drain) / 1000
local drained = elapsed_seconds * drain_rate
queue = math.max(0, queue - drained)
last_drain = now_ms

local allowed = 0
local remaining = 0

if queue + cost <= capacity then
  queue = queue + cost
  allowed = 1
  remaining = math.floor(capacity - queue)
else
  remaining = 0
end

-- Persist state
redis.call('HSET', key, 'queue', queue, 'last_drain', last_drain)
local ttl_seconds = math.ceil(capacity / drain_rate) * 2
redis.call('EXPIRE', key, ttl_seconds)

-- Reset time: when queue fully drains
local drain_time_ms = math.ceil((queue / drain_rate) * 1000)
local reset_ms = now_ms + drain_time_ms

return {allowed, remaining, reset_ms, capacity}
