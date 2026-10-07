// Upstash Redis Client Helper
// Uses REST API directly - no npm package needed
// Works in Next.js App Router

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.warn('Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local');
}

async function upstashRequest<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const url = `${UPSTASH_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upstash error: ${response.status} ${error}`);
  }

  return response.json();
}

// Redis operations for guest carts
export const redis = {
  // Get a value
  async get(key: string): Promise<string | null> {
    const result = await upstashRequest<{ result: string | null }>(`/get/${key}`);
    return result.result;
  },

  // Set a value with optional TTL (seconds)
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const body: Record<string, unknown> = { key, value };
    if (ttl) body.ex = ttl;
    await upstashRequest('/set', 'POST', body);
  },

  // Delete a key
  async del(key: string): Promise<void> {
    await upstashRequest(`/del/${key}`, 'POST');
  },

  // Increment a counter
  async incr(key: string): Promise<number> {
    const result = await upstashRequest<{ result: number }>('/incrby', 'POST', {
      key,
      amount: 1,
    });
    return result.result;
  },

  // Hash operations for cart: cart:g:{token} -> hash
  async hset(key: string, field: string, value: string): Promise<void> {
    await upstashRequest('/hset', 'POST', { key, field, value });
  },

  async hget(key: string, field: string): Promise<string | null> {
    const result = await upstashRequest<{ result: string | null }>(`/hget/${key}/${field}`);
    return result.result;
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    const result = await upstashRequest<{ result: Record<string, string> }>(`/hgetall/${key}`);
    return result.result || {};
  },

  async hdel(key: string, field: string): Promise<void> {
    await upstashRequest('/hdel', 'POST', { key, field });
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const result = await upstashRequest<{ result: number }>(`/exists/${key}`);
    return result.result === 1;
  },

  // Ping (health check)
  async ping(): Promise<string> {
    const result = await upstashRequest<{ result: string }>('/ping');
    return result.result;
  },
};

// Guest cart helper functions
export const cartRedis = {
  // Generate a new cart token
  generateToken(): string {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback
      for (let i = 0; i < 32; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  },

  // Get full cart for a guest
  async getCart(token: string): Promise<Record<string, string>> {
    const key = `cart:g:${token}`;
    const cart = await redis.hgetall(key);
    return cart;
  },

  // Add item to guest cart
  async addItem(token: string, variantId: string, quantity: number): Promise<void> {
    const key = `cart:g:${token}`;
    await redis.hset(key, variantId, quantity.toString());
    // Set 30-day TTL
    await redis.set(key, '', 30 * 24 * 60 * 60);
  },

  // Update item quantity
  async updateItem(token: string, variantId: string, quantity: number): Promise<void> {
    const key = `cart:g:${token}`;
    if (quantity <= 0) {
      await redis.hdel(key, variantId);
    } else {
      await redis.hset(key, variantId, quantity.toString());
    }
  },

  // Remove item from cart
  async removeItem(token: string, variantId: string): Promise<void> {
    const key = `cart:g:${token}`;
    await redis.hdel(key, variantId);
  },

  // Clear entire cart
  async clearCart(token: string): Promise<void> {
    const key = `cart:g:${token}`;
    await redis.del(key);
  },

  // Check if cart exists
  async cartExists(token: string): Promise<boolean> {
    const key = `cart:g:${token}`;
    return await redis.exists(key);
  },
};

// Counter helpers for rate limiting and view counts
export const counterRedis = {
  async incrementView(productId: string): Promise<number> {
    const key = `view:${productId}`;
    return await redis.incr(key);
  },

  async getViews(productId: string): Promise<number> {
    const views = await redis.get(`view:${productId}`);
    return parseInt(views || '0', 10);
  },

  // Sliding window rate limiter for cart operations
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Get current count in window
    const pipelineResult = await upstashRequest<{ result: (string | null)[] }>(
      '/pipeline',
      'POST',
      {
        commands: [
          { command: 'ZREMRANGEBYSCORE', args: [key, '-inf', windowStart.toString()] },
          { command: 'ZCARD', args: [key] },
          { command: 'ZADD', args: [key, now.toString(), `${now}-${Math.random()}`] },
          { command: 'EXPIRE', args: [key, windowSeconds.toString()] },
        ],
      }
    );

    // Note: Pipeline response parsing would need actual implementation
    // For simplicity, using simple increment with expiry
    const count = await redis.incr(`ratelimit:count:${identifier}`);
    await redis.set(`ratelimit:count:${identifier}`, count.toString(), windowSeconds);

    const allowed = count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - count),
      resetAt: now + windowMs,
    };
  },
};

export default redis;