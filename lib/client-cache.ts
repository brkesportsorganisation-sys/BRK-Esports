/**
 * client-cache.ts
 * High-efficiency client-side in-memory cache & request deduplicator.
 *
 * Solves:
 * 1. Concurrent request duplication (e.g., Navbar + MobileBottomNav + Page mounting simultaneously).
 * 2. Unnecessary re-fetching across client-side route navigations.
 * 3. Fast In-Memory TTL data access.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface FetchCacheOptions extends RequestInit {
  ttlMs?: number;         // Time to live in ms (default: 60,000ms = 1 min)
  forceRefresh?: boolean;  // Bypass cache read, but update cache with fresh response
}

const cacheStore = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

/** Default TTLs for common endpoints in milliseconds */
export const CLIENT_CACHE_TTL = {
  SETTINGS: 5 * 60 * 1000,       // 5 minutes (site settings rarely change)
  USER: 60 * 1000,               // 60 seconds (wallet balance & user profile)
  NOTIFICATIONS: 30 * 1000,       // 30 seconds
  SQUADS: 60 * 1000,              // 60 seconds
  TOURNAMENTS: 60 * 1000,         // 60 seconds
  STATIC_ASSETS: 10 * 60 * 1000,  // 10 minutes
} as const;

/**
 * Perform a fetch with in-memory caching and in-flight promise deduplication.
 */
export async function fetchWithClientCache<T = unknown>(
  url: string,
  options?: FetchCacheOptions
): Promise<T> {
  // If running on the server (SSR), bypass client-side in-memory cache
  if (typeof window === 'undefined') {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  const { ttlMs = 60_000, forceRefresh = false, ...fetchOptions } = options || {};
  const cacheKey = `${fetchOptions.method || 'GET'}:${url}`;

  // Only GET requests should be cached / deduplicated
  if ((fetchOptions.method && fetchOptions.method.toUpperCase() !== 'GET')) {
    const res = await fetch(url, fetchOptions);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  const now = Date.now();

  // 1. Return valid cached response if not forced to refresh
  if (!forceRefresh) {
    const cached = cacheStore.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data as T;
    }
  }

  // 2. Return active in-flight request if another component is fetching this identical URL right now
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  // 3. Initiate fetch and share promise
  const requestPromise = (async () => {
    try {
      const res = await fetch(url, fetchOptions);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = (await res.json()) as T;
      // Store in cache
      cacheStore.set(cacheKey, {
        data,
        expiresAt: Date.now() + ttlMs,
      });
      return data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * Read cached data synchronously without making a network request.
 */
export function getClientCachedData<T = unknown>(url: string, method = 'GET'): T | null {
  const cacheKey = `${method.toUpperCase()}:${url}`;
  const cached = cacheStore.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    cacheStore.delete(cacheKey);
    return null;
  }
  return cached.data as T;
}

/**
 * Manually update or seed client cache (e.g., after an edit or update).
 */
export function setClientCachedData<T = unknown>(
  url: string,
  data: T,
  ttlMs = 60_000,
  method = 'GET'
): void {
  const cacheKey = `${method.toUpperCase()}:${url}`;
  cacheStore.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalidate cache for a specific URL, prefix, or regular expression.
 */
export function invalidateClientCache(patternOrUrl?: string | RegExp): void {
  if (!patternOrUrl) {
    cacheStore.clear();
    return;
  }

  if (typeof patternOrUrl === 'string') {
    for (const key of cacheStore.keys()) {
      if (key.includes(patternOrUrl)) {
        cacheStore.delete(key);
      }
    }
  } else if (patternOrUrl instanceof RegExp) {
    for (const key of cacheStore.keys()) {
      if (patternOrUrl.test(key)) {
        cacheStore.delete(key);
      }
    }
  }
}
