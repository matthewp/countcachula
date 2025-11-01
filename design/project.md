# Count Cachula

## Architecture Overview

## Core Concept

A simpler alternative to local-first architectures that provides many of the same benefits without the complexity of client-side databases, schema migrations, and complex sync protocols.

### Key Principles

1. **Stale-while-revalidate** - Return cached responses instantly, then update in the background
2. **Aggressive caching via Cache API** - Store all API responses in the browser's Cache API
3. **Proactive cache warming** - Use persistent connections (SSE/WebSocket) to pre-fetch and cache data for pages not yet visited
4. **Server as source of truth** - No complex client-side query engines or conflict resolution

### Benefits Over Traditional Local-First

- No IndexedDB complexity
- No schema migrations on the client
- No need to maintain identical query logic on client and server
- Simpler mental model using standard HTTP semantics
- Leverage existing cache headers, ETags, etc.

## Open Questions

### Cache Invalidation
How do we handle scenarios where the server pushes an update that affects multiple cached endpoints?
- Option A: Push actual response updates
- Option B: Push invalidation signals only
- Hybrid approach?

### Mutations
How do we handle optimistic updates?
- Write to cache immediately and reconcile?
- Queue mutations?
- What's the rollback strategy if server rejects?

### Cache Coherence
If the same data appears in different API responses (e.g., `/users/123` and `/users?team=A`), how do we keep them in sync?
- Do we need a dependency graph?
- Invalidate broadly?
- Accept temporary inconsistency?

## Implementation Status

### v0.1 - Basic SWR Implementation ✓

**Core API (`@countcachula/core`):**
- `fetch(request: Request): CacheObservable<Response>` - Main entry point
- `CacheObservable<T>` - Minimal observable implementation
  - `observe(callback: (data: T) => void): () => void` - Subscribe to updates
  - Multiple observers supported
  - Lazy execution (starts on first observer)

**Behavior:**
- Cache HIT: Returns cached response immediately, revalidates in background
- Cache MISS: Waits for network, then caches
- Always clones responses before caching/notifying (Response bodies can only be read once)
- Cache name: `countcachula-v1` (hardcoded)
- Ignores Cache-Control headers for now (always revalidates)

**Demo Integration:**
- Updated `demos/bugs` to use Count Cachula for loading issues
- Observable pattern integrated with Preact state management
- Shows instant response from cache, then updates when fresh data arrives

### Next Steps / TODOs

- [ ] Handle mutations (POST/PATCH/DELETE) - should these bypass cache or invalidate?
- [ ] Cache invalidation strategies
- [ ] Respect Cache-Control headers
- [ ] SSE/WebSocket integration for cache warming
- [ ] Better error handling (network failures, parse errors)
- [ ] Optimistic updates for mutations

## Discussion Notes

_Add discussion notes as we explore these questions_
