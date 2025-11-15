# @countcachula/react

React hooks for Count Cachula - stale-while-revalidate caching with Suspense support.

## Installation

```bash
npm install @countcachula/react @countcachula/core
```

## Usage

### Basic Example with Suspense

```tsx
import { Suspense } from 'react';
import { useFetch } from '@countcachula/react';

function IssueList() {
  // This suspends until data is available
  const issues = useFetch<Issue[]>('/api/issues');

  // Component only renders when data exists - no loading state needed!
  return (
    <ul>
      {issues.map(issue => (
        <li key={issue.id}>{issue.title}</li>
      ))}
    </ul>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <Suspense fallback={<LoadingSpinner />}>
        <IssueList />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### With Authentication Headers

```tsx
function ProtectedData() {
  const data = useFetch<UserData>('/api/user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return <div>{data.name}</div>;
}
```

### Custom Transform Function

```tsx
function TextContent() {
  const content = useFetch<string>('/api/readme.txt', {
    transform: async (response) => response.text(),
  });

  return <pre>{content}</pre>;
}
```

### SSE Connection for Real-time Updates

```tsx
import { useConnection } from '@countcachula/react';

function App() {
  // Establish SSE connection for cache invalidation
  useConnection('/api/cache-events', {
    preload: {
      onHint: true,
      maxConcurrent: 3,
    },
  });

  return <YourApp />;
}
```

## API Reference

### `useFetch<T>(url: string, options?: FetchOptions): T`

Fetches data with automatic caching and Suspense support.

#### Parameters:
- `url`: The URL to fetch
- `options`: Optional fetch configuration
  - `headers`: Request headers
  - `transform`: Custom transform function (defaults to JSON parsing)
  - All other standard `RequestInit` options except `method`

#### Returns:
The fetched and typed data. Never returns `undefined` or loading states.

#### Behavior:
1. **First render (no cache)**: Suspends until data arrives
2. **First render (with cache)**: Returns cached data immediately, fetches fresh data in background
3. **Fresh data arrives**: Component re-renders with new data, no loading state
4. **Errors**: Throws to nearest Error Boundary

### `useConnection(endpoint: string, options?: ConnectionOptions): void`

Manages SSE connection for real-time cache invalidation.

#### Parameters:
- `endpoint`: SSE endpoint URL
- `options`: Connection configuration
  - `preload`: Preloading configuration
    - `onInvalidate`: Preload on invalidation events
    - `onHint`: Preload on hint events
    - `maxConcurrent`: Max concurrent preloads

## TypeScript

Full TypeScript support with generics:

```tsx
interface Issue {
  id: number;
  title: string;
  status: 'open' | 'closed';
}

function IssueDetail({ id }: { id: number }) {
  // Type is inferred as Issue
  const issue = useFetch<Issue>(`/api/issues/${id}`);

  // TypeScript knows issue.title is a string
  return <h1>{issue.title}</h1>;
}
```

## Key Benefits

- **No loading states** - Suspense handles loading UI
- **Type safety** - Data is always the correct type, never undefined
- **Stale-while-revalidate** - Instant cache hits with background updates
- **Real-time updates** - SSE integration for cache invalidation
- **Clean components** - No conditional rendering for loading/error states

## Requirements

- React 18.0.0 or higher
- `@countcachula/core` package

## Migration from Observable Pattern

Before (using observables directly):
```tsx
const [issues, setIssues] = useState<Issue[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const observable = CountCachula.fetch(request);
  const unsubscribe = observable.observe(async (response) => {
    const data = await response.json();
    setIssues(data);
    setLoading(false);
  });
  return unsubscribe;
}, []);

if (loading) return <Spinner />;
return <IssueList issues={issues} />;
```

After (using React hooks):
```tsx
const issues = useFetch<Issue[]>('/api/issues');
return <IssueList issues={issues} />;
```

Much cleaner!