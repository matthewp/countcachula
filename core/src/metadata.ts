const CACHE_NAME = 'countcachula-v1';
const META_URL = '/_countcachula/meta';

interface Metadata {
  lastSync: string;
}

export async function getLastSync(): Promise<string | null> {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(META_URL);
  if (!response) return null;
  const meta: Metadata = await response.json();
  return meta.lastSync;
}

export async function updateLastSync(): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    new Request(META_URL),
    new Response(JSON.stringify({ lastSync: new Date().toISOString() }))
  );
}
