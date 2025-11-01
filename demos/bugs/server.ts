import { serve } from '@hono/node-server';
import api from './api/index';

const port = 3001;

console.log(`[API Server] Starting on port ${port}`);

serve({
  fetch: api.fetch,
  port,
});

console.log(`[API Server] Running at http://localhost:${port}`);
