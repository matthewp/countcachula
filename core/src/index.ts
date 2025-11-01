import { getLastSync, updateLastSync } from './metadata.js';

const CACHE_NAME = 'countcachula-v1';

export class Connection {
  private eventSource: EventSource;

  constructor(eventSource: EventSource) {
    this.eventSource = eventSource;
  }

  close(): void {
    this.eventSource.close();
  }
}

// Global state for tracking tags and observables
const tagToUrls = new Map<string, Set<string>>();
const urlToTags = new Map<string, Set<string>>();
const activeObservables = new Map<string, Set<CacheObservable<Response>>>();
let preloadQueue: string[] = [];
let activePreloads = 0;
let preloadConfig: PreloadConfig = {
  onInvalidate: false,
  onHint: true,
  maxConcurrent: 3
};

interface PreloadConfig {
  onInvalidate?: boolean;
  onHint?: boolean;
  maxConcurrent?: number;
}

interface ConnectOptions {
  preload?: PreloadConfig;
}

export class CacheObservable<T> {
  private observers = new Set<(data: T) => void>();
  private started = false;
  private startFn: () => void;
  private cleanupFn?: () => void;

  constructor(startFn: () => void, cleanupFn?: () => void) {
    this.startFn = startFn;
    this.cleanupFn = cleanupFn;
  }

  observe(callback: (data: T) => void): () => void {
    this.observers.add(callback);

    // Start fetch logic on first observer
    if (!this.started) {
      this.started = true;
      this.startFn();
    }

    // Return unsubscribe function
    return () => {
      this.observers.delete(callback);

      // Clean up if no more observers
      if (this.observers.size === 0 && this.cleanupFn) {
        this.cleanupFn();
      }
    };
  }

  notify(data: T): void {
    this.observers.forEach((cb) => cb(data));
  }

  hasObservers(): boolean {
    return this.observers.size > 0;
  }
}

export function fetch(request: Request): CacheObservable<Response> {
  // Only support GET requests
  if (request.method !== 'GET') {
    throw new Error(
      'CountCachula.fetch() only supports GET requests. Use regular fetch() for mutations.'
    );
  }

  const url = request.url;

  // Always create a new observable (no deduplication)
  const observable = new CacheObservable<Response>(
    () => {
      startFetch(request, observable);
    },
    () => {
      // Cleanup: remove this observable from the active set
      const observables = activeObservables.get(url);
      if (observables) {
        observables.delete(observable);
        if (observables.size === 0) {
          activeObservables.delete(url);
        }
      }
    }
  );

  // Add to active observables set for this URL
  if (!activeObservables.has(url)) {
    activeObservables.set(url, new Set());
  }
  activeObservables.get(url)!.add(observable);

  return observable;
}

async function startFetch(
  request: Request,
  observable: CacheObservable<Response>
): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);

    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Cache HIT: Return cached data immediately
      observable.notify(cachedResponse.clone());

      // Revalidate in background
      try {
        const networkResponse = await globalThis.fetch(request);
        // Extract and store cache tags
        storeCacheTags(request.url, networkResponse);
        // Update cache
        await cache.put(request, networkResponse.clone());
        // Update metadata
        await updateLastSync();
        // Notify observers with fresh data
        observable.notify(networkResponse.clone());
      } catch (error) {
        // Network failed during revalidation, but we already served cached data
        console.warn('Background revalidation failed:', error);
      }
    } else {
      // Cache MISS: Wait for network
      const networkResponse = await globalThis.fetch(request);
      // Extract and store cache tags
      storeCacheTags(request.url, networkResponse);
      // Store in cache
      await cache.put(request, networkResponse.clone());
      // Update metadata
      await updateLastSync();
      // Notify observers
      observable.notify(networkResponse.clone());
    }
  } catch (error) {
    // Initial fetch failed
    console.error('Fetch failed:', error);
    throw error;
  }
}

function storeCacheTags(url: string, response: Response): void {
  const cacheTagsHeader = response.headers.get('Cache-Tags');
  if (!cacheTagsHeader) return;

  const tags = cacheTagsHeader.split(',').map(tag => tag.trim());

  // Store URL -> Tags mapping
  urlToTags.set(url, new Set(tags));

  // Store Tag -> URLs mapping
  tags.forEach(tag => {
    if (!tagToUrls.has(tag)) {
      tagToUrls.set(tag, new Set());
    }
    tagToUrls.get(tag)!.add(url);
  });
}

export async function connect(endpoint: string, options: ConnectOptions = {}): Promise<Connection> {
  // Merge preload config
  if (options.preload) {
    preloadConfig = { ...preloadConfig, ...options.preload };
  }

  // Get last sync timestamp and append to URL
  const since = await getLastSync();
  const url = since ? `${endpoint}?since=${since}` : endpoint;

  const eventSource = new EventSource(url);

  eventSource.addEventListener('invalidate', (event) => {
    handleInvalidate(event.data);
  });

  eventSource.addEventListener('preload-hint', (event) => {
    handlePreloadHint(event.data);
  });

  eventSource.addEventListener('error', (error) => {
    console.error('SSE connection error:', error);
  });

  return new Connection(eventSource);
}

async function handleInvalidate(data: string): Promise<void> {
  const tags = data.split(',').map(tag => tag.trim());

  console.log('[CountCachula] Invalidating tags:', tags);

  const urlsToInvalidate = new Set<string>();

  // Find all URLs associated with these tags
  tags.forEach(tag => {
    const urls = tagToUrls.get(tag);
    if (urls) {
      urls.forEach(url => urlsToInvalidate.add(url));
    }
  });

  // For each URL that needs invalidation
  for (const url of urlsToInvalidate) {
    const observables = activeObservables.get(url);

    if (observables && observables.size > 0) {
      // Has active observables: refetch for each one with observers
      const hasObservers = Array.from(observables).some(obs => obs.hasObservers());

      if (hasObservers) {
        console.log('[CountCachula] Refetching (has observers):', url);
        const request = new Request(url);
        // Refetch for all observables with observers
        for (const observable of observables) {
          if (observable.hasObservers()) {
            await startFetch(request, observable);
          }
        }
      } else {
        // No active observers: just remove from cache
        console.log('[CountCachula] Removing from cache (no observers):', url);
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(new Request(url));
      }
    } else {
      // No active observables: just remove from cache
      console.log('[CountCachula] Removing from cache (no observers):', url);
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(new Request(url));
    }
  }
}

async function handlePreloadHint(data: string): Promise<void> {
  if (!preloadConfig.onHint) return;

  const routes = data.split(',').map(route => route.trim());

  console.log('[CountCachula] Preload hints received:', routes);

  // Add routes to preload queue
  routes.forEach(route => {
    if (!preloadQueue.includes(route)) {
      preloadQueue.push(route);
    }
  });

  // Process queue
  processPreloadQueue();
}

async function processPreloadQueue(): Promise<void> {
  while (preloadQueue.length > 0 && activePreloads < (preloadConfig.maxConcurrent || 3)) {
    const route = preloadQueue.shift();
    if (!route) break;

    activePreloads++;

    console.log('[CountCachula] Preloading:', route);

    // Create a request and fetch it (which will cache it)
    const request = new Request(route);
    const observable = fetch(request);

    // Subscribe to trigger the fetch, then immediately unsubscribe
    const unsubscribe = observable.observe(() => {
      unsubscribe();
      activePreloads--;
      // Continue processing queue
      processPreloadQueue();
    });
  }
}
