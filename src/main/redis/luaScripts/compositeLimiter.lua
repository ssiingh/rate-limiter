-- Composite Rate Limiter Lua Script
-- Runs multiple sub-checks and combines results with AND/OR logic
-- KEYS[1..N] = sub-limit counter keys
-- ARGV[1] = combination mode: 'AND' | 'OR' | 'PRIORITY'
-- ARGV[2] = number of components (N)
-- ARGV[3..] = per-component args: limit, window_ms, cost, now_ms (4 args each)

local mode = ARGV[1]
local num_components = tonumber(ARGV[2])

local results = {}
local any_allowed = false
local all_allowed = true
local min_remaining = math.huge
local max_reset = 0
local first_allowed_result = nil

for i = 1, num_components do
  local key = KEYS[i]
  local base_idx = 3 + (i - 1) * 4
  local limit = tonumber(ARGV[base_idx])
  local window_ms = tonumber(ARGV[base_idx + 1])
  local cost = tonumber(ARGV[base_idx + 2])
  local now_ms = tonumber(ARGV[base_idx + 3])
  local ttl_seconds = math.ceil(window_ms / 1000) + 1
  local window_start = now_ms - window_ms

  -- Use sliding window logic per component
  redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
  local current = redis.call('ZCARD', key)
  local component_allowed = current < limit

  if component_allowed then
    local req_id = tostring(now_ms) .. ':' .. tostring(i)
    redis.call('ZADD', key, now_ms, req_id)
    redis.call('EXPIRE', key, ttl_seconds)
  end

  local remaining = math.max(0, limit - current - (component_allowed and 1 or 0))
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset_ms = now_ms + window_ms
  if #oldest > 0 then
    reset_ms = tonumber(oldest[2]) + window_ms
  end

  results[i] = {component_allowed and 1 or 0, remaining, reset_ms, limit}

  if component_allowed then any_allowed = true end
  if not component_allowed then all_allowed = false end
  if remaining < min_remaining then min_remaining = remaining end
  if reset_ms > max_reset then max_reset = reset_ms end

  if mode == 'PRIORITY' and component_allowed and first_allowed_result == nil then
    first_allowed_result = results[i]
  end
end

local final_allowed = 0
if mode == 'AND' then
  final_allowed = all_allowed and 1 or 0
elseif mode == 'OR' then
  final_allowed = any_allowed and 1 or 0
elseif mode == 'PRIORITY' then
  final_allowed = first_allowed_result ~= nil and 1 or 0
end

return {final_allowed, min_remaining, max_reset, num_components}
