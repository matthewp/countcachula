# @countcachula/sse

Server-side SSE (Server-Sent Events) abstraction for Count Cachula cache invalidation and preload hints.

## Overview

`CacheHub` manages SSE connections and provides a clean API for broadcasting cache invalidation events and preload hints to connected clients.

## Installation

```bash
npm install @countcachula/sse
```

## Usage

```typescript
import { CacheHub } from '@countcachula/sse';
import { streamSSE } from 'hono/streaming';

const hub = new CacheHub();

// SSE endpoint
app.get('/api/cache-events', (c) => {
  return streamSSE(c, async (stream) => {
    // Register connection
    hub.addConnection(stream);

    // Send initial message
    await stream.writeSSE({
      event: 'connected',
      data: 'connected'
    });

    // Clean up on disconnect
    c.req.raw.signal.addEventListener('abort', () => {
      hub.removeConnection(stream);
    });

    // Keep connection alive
    while (!c.req.raw.signal.aborted) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
});

// Mutation endpoints
app.patch('/api/items/:id', async (c) => {
  const id = c.req.param('id');

  // ... update logic ...

  // Broadcast invalidation to all connected clients
  hub.invalidate([`item:${id}`, 'items-list']);

  return c.json({ success: true });
});

app.get('/api/items', async (c) => {
  const items = db.getItems();

  // Send preload hints for individual items
  if (items.length > 0) {
    const itemUrls = items.map(item => `/api/items/${item.id}`);
    hub.preloadHint(itemUrls);
  }

  return c.json(items);
});
```

## API

### `CacheHub`

#### `addConnection(stream: SSEStream): void`

Register a new SSE connection.

```typescript
hub.addConnection(stream);
```

#### `removeConnection(stream: SSEStream): void`

Unregister an SSE connection.

```typescript
hub.removeConnection(stream);
```

#### `invalidate(tags: string[]): Promise<void>`

Broadcast cache invalidation event to all connected clients.

```typescript
await hub.invalidate(['user:123', 'users-list']);
```

#### `preloadHint(routes: string[]): Promise<void>`

Broadcast preload hint event to all connected clients.

```typescript
await hub.preloadHint(['/api/items/1', '/api/items/2']);
```

### `SSEStream`

The stream interface expected by `CacheHub`:

```typescript
interface SSEStream {
  writeSSE: (message: { data: string; event: string }) => Promise<void>;
}
```

This matches Hono's `streamSSE` stream object.

## Features

- **Automatic cleanup**: Dead connections are automatically removed during broadcasts
- **Framework agnostic**: Works with any SSE stream that implements `writeSSE`
- **Simple API**: Clean methods for common cache operations
- **Type safe**: Full TypeScript support

## More Information

Part of the [Count Cachula](https://github.com/matthewp/countcachula) project.

## License

BSD-3-Clause
