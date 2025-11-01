# Claude Context for Count Cachula

## Project Overview

See [README.md](./README.md) for complete project documentation including:
- What Count Cachula is and why it exists
- Installation and quick start guide
- API reference
- Usage examples and integration patterns
- Current status and roadmap

## Project Structure

```
cache-first/
├── core/                    # Main library package
│   └── src/
│       └── index.ts        # Core implementation (fetch, CacheObservable)
├── demos/
│   └── bugs/               # Bug tracker demo application
│       ├── api/            # Mock API server
│       │   ├── db.ts       # In-memory database
│       │   └── index.ts    # API routes
│       ├── src/            # Frontend React app
│       │   ├── App.tsx     # Main app component
│       │   ├── components/ # UI components
│       │   └── types.ts    # TypeScript types
│       └── server.ts       # Demo server setup
└── design/
    └── project.md          # Design documentation
```

## Key Concepts

### Stale-While-Revalidate Pattern
The library implements this pattern:
1. Check cache for existing data
2. If found: return immediately + fetch fresh data in background
3. If not found: wait for network response
4. Notify all observers when fresh data arrives

### CacheObservable
Custom observable implementation that:
- Allows multiple observers to subscribe to the same request
- Emits up to 2 values: cached response (if available) + fresh response
- Lazy execution: only starts on first subscription
- Returns unsubscribe function for cleanup

## Important Files

- **core/src/index.ts**: Main library code - `fetch()` and `CacheObservable` implementation
- **demos/bugs/src/App.tsx**: Example usage with React/Preact
- **design/project.md**: Detailed design decisions and rationale

## Development Commands

```bash
# Install dependencies
npm install

# Start API server (in root)
npm run api

# Start bug tracker demo (in demos/bugs/)
cd demos/bugs && npm run dev
```

## Common Tasks

### Adding New Features
- Core library code is in `core/src/index.ts`
- Test features using the bug tracker demo in `demos/bugs/`

### Testing Changes
- Run the API server: `npm run api` (from root)
- Run the demo: `cd demos/bugs && npm run dev`
- Open browser to see real-time updates from cache

### Understanding the Flow
1. Start with `core/src/index.ts` to see the fetch implementation
2. Look at `demos/bugs/src/App.tsx` for integration patterns
3. Check `design/project.md` for architectural decisions

## Current Limitations

As noted in README.md, v0.1 focuses on basic functionality:
- No cache invalidation strategies yet
- Doesn't respect Cache-Control headers
- No optimistic updates for mutations
- Basic error handling only

See README.md roadmap for planned improvements.
