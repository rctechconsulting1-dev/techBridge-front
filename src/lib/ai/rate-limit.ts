import { Redis } from "@upstash/redis";

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 120);
}

function memoryLimit({
  key,
  windowMs,
  maxRequests,
}: {
  key: string;
  windowMs: number;
  maxRequests: number;
}): { allowed: boolean; retryAfter: number; source: "memory" } {
  const now = Date.now();
  const current = memoryBuckets.get(key);

  if (!current || now >= current.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0, source: "memory" };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      source: "memory",
    };
  }

  current.count += 1;
  memoryBuckets.set(key, current);
  return { allowed: true, retryAfter: 0, source: "memory" };
}

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redisClient = new Redis({ url, token });
  return redisClient;
}

export async function checkRateLimit({
  namespace,
  key,
  windowMs,
  maxRequests,
}: {
  namespace: string;
  key: string;
  windowMs: number;
  maxRequests: number;
}): Promise<{
  allowed: boolean;
  retryAfter: number;
  source: "redis" | "memory";
}> {
  const safeNamespace = sanitizeKey(namespace);
  const safeKey = sanitizeKey(key || "unknown");
  const fullKey = `ratelimit:${safeNamespace}:${safeKey}`;
  const redis = getRedis();

  if (!redis) {
    return memoryLimit({ key: fullKey, windowMs, maxRequests });
  }

  try {
    const count = await redis.incr(fullKey);
    if (count === 1) {
      await redis.pexpire(fullKey, windowMs);
    }

    if (count > maxRequests) {
      const ttlMs = (await redis.pttl(fullKey)) ?? windowMs;
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil(ttlMs / 1000)),
        source: "redis",
      };
    }

    return { allowed: true, retryAfter: 0, source: "redis" };
  } catch {
    return memoryLimit({ key: fullKey, windowMs, maxRequests });
  }
}
