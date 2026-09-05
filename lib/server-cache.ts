/**
 * server-cache.ts
 * Lightweight in-memory TTL cache for server-side API routes.
 * Prevents repeated Supabase queries for frequently-read, rarely-changed data.
 *
 * NOTE: This cache lives in the Node.js process memory (Vercel serverless warm instances).
 * It is NOT shared across different serverless instances, but dramatically reduces
 * DB hits within a single warm instance.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ServerCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Purge all expired entries (optional maintenance) */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

// Singleton — survives across requests in the same warm serverless instance
const globalWithCache = globalThis as typeof globalThis & {
  __serverCache?: ServerCache;
};
if (!globalWithCache.__serverCache) {
  globalWithCache.__serverCache = new ServerCache();
}

export const serverCache = globalWithCache.__serverCache;

// Cache TTL constants (seconds)
export const CACHE_TTL = {
  LEADERBOARD: 120,      // 2 minutes — leaderboard changes infrequently
  SQUADS: 180,           // 3 minutes — squad list
  TOURNAMENTS: 120,      // 2 minutes — tournament list
  ANNOUNCEMENTS: 300,    // 5 minutes — announcements rarely change
  BANNERS: 600,          // 10 minutes — banners very rarely change
  SHOP_ITEMS: 300,       // 5 minutes
  NOTIFICATION_SCHEDULES: 60, // 1 minute
  SITE_SETTINGS: 300,    // 5 minutes
} as const;
