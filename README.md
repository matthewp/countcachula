# 🧛 Count Cachula

A simpler alternative to local-first architectures that provides many of the same benefits without the complexity of client-side databases, schema migrations, and complex sync protocols.

## What is Count Cachula?

Count Cachula is a lightweight cache-first library that uses the **stale-while-revalidate** pattern to make your web applications feel instant. It returns cached responses immediately while fetching fresh data in the background, giving you the speed of local-first apps with the simplicity of standard HTTP.

## Why Count Cachula?

**Benefits over traditional local-first architectures:**
- ✅ No IndexedDB complexity
- ✅ No schema migrations on the client
- ✅ No need to maintain identical query logic on client and server
- ✅ Simpler mental model using standard HTTP semantics
- ✅ Leverage existing cache headers, ETags, etc.
- ✅ Server remains the source of truth

**Benefits over plain fetch:**
- ⚡ Instant responses from cache
- 🔄 Automatic background revalidation
- 📊 Observable pattern for reactive updates
- 💾 Built on browser's Cache API

## Installation

```bash
npm install @countcachula/core
```

## Quick Start

```typescript
import * as CountCachula from '@countcachula/core';

// Create a request
const request = new Request('/api/users');

// Fetch with cache-first strategy
const observable = CountCachula.fetch(request);

// Subscribe to updates
observable.observe(async (response) => {
  const data = await response.json();
  console.log('Data received:', data);
  // This will be called:
  // 1. Immediately with cached data (if available)
  // 2. Again when fresh data arrives from network
});
```

## How It Works

### Cache Hit Flow
```
1. Request made → Check cache
2. Cache HIT → Return cached data immediately ⚡
3. Start background revalidation
4. Fresh data arrives → Notify observers with update 🔄
```

### Cache Miss Flow
```
1. Request made → Check cache
2. Cache MISS → Wait for network
3. Network response → Store in cache
4. Notify observers with data 📥
```

## API Reference

### `fetch(request: Request): CacheObservable<Response>`

Main entry point for making cache-first requests.

**Parameters:**
- `request: Request` - Standard Fetch API Request object

**Returns:**
- `CacheObservable<Response>` - Observable that emits Response objects

**Example:**
```typescript
const request = new Request('/api/data');
const observable = CountCachula.fetch(request);
```

### `CacheObservable<T>`

Observable implementation for handling cached and fresh responses.

#### `observe(callback: (data: T) => void): () => void`

Subscribe to response updates.

**Parameters:**
- `callback: (data: T) => void` - Function called with each response

**Returns:**
- `() => void` - Unsubscribe function

**Example:**
```typescript
const unsubscribe = observable.observe((response) => {
  // Handle response
});

// Later: clean up subscription
unsubscribe();
```

## Integration Examples

### With Preact/React

```typescript
import { useState, useEffect } from 'preact/hooks';
import * as CountCachula from '@countcachula/core';

function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const request = new Request('/api/users');
    const observable = CountCachula.fetch(request);

    const unsubscribe = observable.observe(async (response) => {
      const data = await response.json();
      setUsers(data);
    });

    return unsubscribe; // Clean up on unmount
  }, []);

  return (
    <div>
      {users.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}
```

### With Mutations

```typescript
// POST request
const createUser = async (userData) => {
  const request = new Request('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  const observable = CountCachula.fetch(request);

  observable.observe(async (response) => {
    if (response.ok) {
      console.log('User created!');
    }
  });
};

// PATCH request
const updateUser = async (userId, updates) => {
  const request = new Request(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  const observable = CountCachula.fetch(request);

  observable.observe(async (response) => {
    if (response.ok) {
      console.log('User updated!');
    }
  });
};
```

## Demo

Check out the bug tracker demo to see Count Cachula in action:

🚀 **[View Live Demo](https://bugs.countcachula.spooky.click/)** - A working bug tracker showcasing Count Cachula's capabilities.

Or run it locally:

```bash
# Install dependencies
npm install

# Start the API server
npm run api

# In another terminal, start the demo
cd demos/bugs
npm run dev
```

The demo showcases:
- Instant loading of issues list from cache
- Background revalidation with automatic UI updates
- Mutations (creating issues, adding comments, changing status)
- Multiple cached endpoints (issues list, issue details, labels)

## Current Status (v0.1)

**Implemented:**
- ✅ Basic stale-while-revalidate pattern
- ✅ CacheObservable with multiple observers
- ✅ Cache API integration
- ✅ Lazy execution (starts on first observer)
- ✅ Response cloning for reusability

**Not Yet Implemented:**
- ⏳ Smart cache invalidation strategies
- ⏳ Respect for Cache-Control headers
- ⏳ SSE/WebSocket integration for cache warming
- ⏳ Optimistic updates for mutations
- ⏳ Better error handling and retry logic
- ⏳ Cache coherence across related endpoints

## Architecture Principles

1. **Stale-while-revalidate** - Return cached responses instantly, then update in the background
2. **Aggressive caching** - Store all API responses in the browser's Cache API
3. **Proactive cache warming** - (Planned) Use persistent connections to pre-fetch data
4. **Server as source of truth** - No complex client-side query engines or conflict resolution

## Roadmap

- [ ] Handle mutations more intelligently (cache invalidation)
- [ ] Respect Cache-Control and other cache headers
- [ ] Add SSE/WebSocket support for proactive cache warming
- [ ] Implement optimistic updates
- [ ] Add cache coherence strategies
- [ ] Performance monitoring and debugging tools

## Contributing

This is an early-stage project. Issues, ideas, and contributions are welcome!

GitHub: https://github.com/matthewp/countcachula

## License

BSD-3-Clause
