-- KEYS[1] = The unique key (e.g., "rate_limit:127.0.0.1")
-- ARGV[1] = Capacity (Max burst allowed, e.g., 5 requests)
-- ARGV[2] = Refill Rate (Tokens per second, e.g., 1)
-- ARGV[3] = Current Timestamp (Unix time in seconds)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Retrieve current tokens and last refill time
local bucket = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

-- Initialize bucket if it doesn't exist
if tokens == nil then
    tokens = capacity
    last_refill = now
end

-- Refill logic: Calculate tokens to add based on time passed
local delta = math.max(0, now - last_refill)
local refill_amount = delta * rate
tokens = math.min(capacity, tokens + refill_amount)

-- Consume logic
if tokens >= 1 then
    tokens = tokens - 1
    -- Save new state and expire key after 60s to save RAM
    redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
    redis.call("EXPIRE", key, 60)
    return 1 -- Allowed
else
    return 0 -- Rejected
end