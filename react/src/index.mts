import { useEffect, useSyncExternalStore, use } from 'react';
import * as CountCachula from '@countcachula/core';

export interface FetchOptions extends Omit<RequestInit, 'method'> {
  transform?: <T>(response: Response) => Promise<T>;
}

// Wrapper object that caches observable emissions and manages subscribers
interface CacheWrapper<T> {
  lastValue: T | undefined;
  hasValue: boolean;
  subscribers: Set<() => void>;
  sourceUnsubscribe: (() => void) | null;
  promise: Promise<T>;
}

// Module-level cache shared across all component instances
const observableCache = new Map<string, CacheWrapper<any>>();

// Get or create a cached wrapper for a given URL + options combination
function getCachedWrapper<T>(url: string, options?: FetchOptions): CacheWrapper<T> {
  const cacheKey = `${url}:${JSON.stringify(options || {})}`;

  if (!observableCache.has(cacheKey)) {
    const { transform, ...requestOptions } = options || {};
    const request = new Request(url, requestOptions);
    const observable = CountCachula.fetch(request);

    // Create new wrapper
    const wrapper: CacheWrapper<T> = {
      lastValue: undefined,
      hasValue: false,
      subscribers: new Set(),
      sourceUnsubscribe: null,
      promise: undefined as any, // Will be set immediately below
    };

    // Create promise for Suspense (resolves with first emission)
    wrapper.promise = new Promise<T>((resolve, reject) => {
      let firstEmission = true;

      // Subscribe to source observable
      wrapper.sourceUnsubscribe = observable.observe(async (response: Response) => {
        try {
          // Transform response to data
          const result = transform
            ? await transform<T>(response.clone())
            : await response.json() as T;

          // Store the latest value
          wrapper.lastValue = result;
          wrapper.hasValue = true;

          // Resolve promise on first emission (for Suspense)
          if (firstEmission) {
            firstEmission = false;
            resolve(result);
          }

          // Notify all subscribers of the update
          wrapper.subscribers.forEach(callback => callback());
        } catch (err) {
          if (firstEmission) {
            firstEmission = false;
            reject(err instanceof Error ? err : new Error(String(err)));
          }
          // For now, ignore errors on subsequent emissions
        }
      });
    });

    observableCache.set(cacheKey, wrapper);
  }

  return observableCache.get(cacheKey)!;
}

export function useFetch<T>(url: string, options?: FetchOptions): T {
  const wrapper = getCachedWrapper<T>(url, options);

  // Subscribe to wrapper using useSyncExternalStore
  // This handles replay (getSnapshot returns cached value) and updates
  const data = useSyncExternalStore(
    // Subscribe function - add component to subscribers
    (callback) => {
      wrapper.subscribers.add(callback);

      // Cleanup function - remove from subscribers
      return () => {
        wrapper.subscribers.delete(callback);
        // Note: We keep the cache entry alive even when no subscribers
        // This prevents infinite recursion and maximizes cache hits
      };
    },
    // Get snapshot - return current cached value
    () => wrapper.lastValue,
    // Server snapshot - return undefined for SSR
    () => undefined
  );

  // Use the promise for Suspense if we don't have data yet
  if (!wrapper.hasValue) {
    use(wrapper.promise);
  }

  return data as T;
}

export interface ConnectionOptions {
  preload?: {
    onInvalidate?: boolean;
    onHint?: boolean;
    maxConcurrent?: number;
  };
}

export function useConnection(endpoint: string, options?: ConnectionOptions): void {
  useEffect(() => {
    let connection: CountCachula.Connection | null = null;

    // Connect to SSE endpoint
    CountCachula.connect(endpoint, options)
      .then(conn => {
        connection = conn;
      })
      .catch(err => {
        console.error('Failed to establish SSE connection:', err);
      });

    // Cleanup on unmount
    return () => {
      connection?.close();
    };
  }, [endpoint, JSON.stringify(options)]);
}

// Re-export types from core for convenience
export type { Connection } from '@countcachula/core';
