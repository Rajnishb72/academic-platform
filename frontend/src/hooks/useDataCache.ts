'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * In-memory stale-while-revalidate cache for Supabase data.
 *
 * How it works:
 *  - On first call with a given key: fetches data and caches it.
 *  - On subsequent calls (same key): IMMEDIATELY returns cached data
 *    and revalidates in the background.
 *  - Cache is keyed per-user so data doesn't leak between accounts.
 *  - TTL = 2 minutes — after that, data is still returned instantly
 *    but a background refresh is triggered.
 *
 * Usage:
 *   const { data, loading, refresh } = useDataCache(
 *     `dashboard-${userId}`,
 *     () => fetchDashboardData(userId)
 *   );
 */

interface CacheEntry<T> {
    data: T;
    ts: number;
}

const _cache = new Map<string, CacheEntry<any>>();
const _inflight = new Map<string, Promise<any>>();
const TTL = 2 * 60 * 1000; // 2 minutes

/** Clear all cached data (call on sign-out or user change) */
export function clearDataCache() {
    _cache.clear();
    _inflight.clear();
}

/** Prefetch data into cache without a component (fire-and-forget) */
export function prefetchData<T>(key: string, fetcher: () => Promise<T>): void {
    if (_cache.has(key) && Date.now() - (_cache.get(key)!.ts) < TTL) return;
    if (_inflight.has(key)) return;

    const promise = fetcher().then((data) => {
        _cache.set(key, { data, ts: Date.now() });
        _inflight.delete(key);
        return data;
    }).catch(() => {
        _inflight.delete(key);
    });
    _inflight.set(key, promise);
}

export function useDataCache<T>(
    key: string | null,
    fetcher: () => Promise<T>,
    deps: any[] = []
): { data: T | null; loading: boolean; refresh: () => void } {
    const cached = key ? _cache.get(key) : null;
    const [data, setData] = useState<T | null>(cached?.data ?? null);
    const [loading, setLoading] = useState(!cached);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const doFetch = useCallback(async (showSpinner: boolean) => {
        if (!key) return;
        if (showSpinner) setLoading(true);

        try {
            // Deduplicate in-flight requests for the same key
            let promise = _inflight.get(key);
            if (!promise) {
                promise = fetcherRef.current();
                _inflight.set(key, promise);
            }

            const result = await promise;
            _cache.set(key, { data: result, ts: Date.now() });
            _inflight.delete(key);
            setData(result);
        } catch (err) {
            _inflight.delete(key);
            console.error(`[cache] Error fetching ${key}:`, err);
        } finally {
            setLoading(false);
        }
    }, [key]);

    useEffect(() => {
        if (!key) {
            setData(null);
            setLoading(false);
            return;
        }

        const cached = _cache.get(key);
        if (cached) {
            // Immediately use cached data
            setData(cached.data);
            setLoading(false);

            // Background revalidate if stale
            if (Date.now() - cached.ts > TTL) {
                doFetch(false);
            }
        } else {
            // No cache — show spinner and fetch
            doFetch(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, doFetch, ...deps]);

    const refresh = useCallback(() => {
        if (key) {
            _cache.delete(key);
            doFetch(true);
        }
    }, [key, doFetch]);

    return { data, loading, refresh };
}
