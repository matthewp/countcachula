import { Hono } from 'hono';
import db from './db.ts';
import { streamSSE } from 'hono/streaming';
import { CacheHub } from '@countcachula/sse';
import {
  authMiddleware,
  requireAuth,
  exchangeCodeForToken,
  getGitHubUser,
  createOrUpdateUser,
  generateToken,
} from './auth.ts';
import type { User } from './auth.ts';

const api = new Hono();

// Apply auth middleware globally
api.use('*', authMiddleware);

// Cache event hub for SSE broadcasts
const hub = new CacheHub();

api.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

// GitHub OAuth callback
api.get('/api/auth/github/callback', async (c) => {
  const code = c.req.query('code');

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const githubUser = await getGitHubUser(accessToken);
    const user = createOrUpdateUser(githubUser);
    const token = generateToken(user);

    // Redirect to frontend with token in query params
    return c.redirect(`/?token=${token}`);
  } catch (error) {
    console.error('OAuth error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Get current user info
api.get('/api/user', (c) => {
  const user = c.get('user') as User | undefined;

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  return c.json(user);
});

// Get GitHub OAuth URL
api.get('/api/auth/github', (c) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${c.req.url.split('/api')[0]}/api/auth/github/callback`;
  const scope = 'user:email';

  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

  return c.json({ url });
});

// SSE endpoint for cache events
api.get('/api/cache-events', (c) => {
  return streamSSE(c, async (stream) => {
    hub.addConnection(stream);

    // Send initial connection message
    await stream.writeSSE({
      data: 'connected',
      event: 'connected',
    });

    // Send initial preload hints for common filtered views
    await stream.writeSSE({
      event: 'preload-hint',
      data: '/api/issues?status=open,/api/issues?status=closed,/api/issues?status=in-progress',
    });

    // Send hints for issues (all on first load, or recently updated if client provides sync timestamp)
    const since = c.req.query('since');
    const issues = since
      ? (db.prepare(
          'SELECT id FROM issues WHERE updated_at > ? ORDER BY updated_at DESC'
        ).all(since) as Array<{ id: number }>)
      : (db.prepare(
          'SELECT id FROM issues ORDER BY updated_at DESC'
        ).all() as Array<{ id: number }>);

    if (issues.length > 0) {
      const issueUrls = issues.map((issue) => `/api/issues/${issue.id}`);
      await stream.writeSSE({
        event: 'preload-hint',
        data: issueUrls.join(','),
      });
    }

    // Keep connection alive with a simple interval
    const keepAliveId = setInterval(async () => {
      try {
        await stream.writeSSE({
          data: 'ping',
          event: 'ping',
        });
      } catch (error) {
        clearInterval(keepAliveId);
        hub.removeConnection(stream);
      }
    }, 30000);

    // Clean up on abort
    c.req.raw.signal.addEventListener('abort', () => {
      clearInterval(keepAliveId);
      hub.removeConnection(stream);
    });

    // Keep stream open
    while (!c.req.raw.signal.aborted) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
});

// Get all issues with their labels and author info
api.get('/api/issues', (c) => {
  const status = c.req.query('status');

  let query = `
    SELECT i.*, u.username, u.avatar_url, u.name as author_name,
           GROUP_CONCAT(l.id || ':' || l.name || ':' || l.color) as labels
    FROM issues i
    JOIN users u ON i.author_id = u.id
    LEFT JOIN issue_labels il ON i.id = il.issue_id
    LEFT JOIN labels l ON il.label_id = l.id
  `;

  if (status) {
    query += ` WHERE i.status = ?`;
  }

  query += ` GROUP BY i.id ORDER BY i.created_at DESC`;

  const stmt = db.prepare(query);
  const rows = status ? stmt.all(status) : stmt.all();

  const issues = (rows as any[]).map((row) => ({
    ...row,
    author: {
      id: row.author_id,
      username: row.username,
      name: row.author_name,
      avatar_url: row.avatar_url,
    },
    labels: row.labels
      ? row.labels.split(',').map((l: string) => {
          const [id, name, color] = l.split(':');
          return { id: parseInt(id), name, color };
        })
      : [],
  }));

  // Add cache tags
  c.header('Cache-Tags', 'issues-list');

  return c.json(issues);
});

// Get single issue with comments and labels
api.get('/api/issues/:id', (c) => {
  const id = c.req.param('id');

  const issue = db.prepare(`
    SELECT i.*, u.username, u.avatar_url, u.name as author_name,
           GROUP_CONCAT(DISTINCT l.id || ':' || l.name || ':' || l.color) as labels
    FROM issues i
    JOIN users u ON i.author_id = u.id
    LEFT JOIN issue_labels il ON i.id = il.issue_id
    LEFT JOIN labels l ON il.label_id = l.id
    WHERE i.id = ?
    GROUP BY i.id
  `).get(id) as any;

  if (!issue) {
    return c.json({ error: 'Issue not found' }, 404);
  }

  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar_url, u.name as author_name
    FROM comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.issue_id = ?
    ORDER BY c.created_at ASC
  `).all(id) as any[];

  // Add cache tags
  c.header('Cache-Tags', `issue:${id},issues-list`);

  return c.json({
    ...issue,
    author: {
      id: issue.author_id,
      username: issue.username,
      name: issue.author_name,
      avatar_url: issue.avatar_url,
    },
    labels: issue.labels
      ? issue.labels.split(',').map((l: string) => {
          const [id, name, color] = l.split(':');
          return { id: parseInt(id), name, color };
        })
      : [],
    comments: comments.map(comment => ({
      ...comment,
      author: {
        id: comment.author_id,
        username: comment.username,
        name: comment.author_name,
        avatar_url: comment.avatar_url,
      },
    })),
  });
});

// Create new issue
api.post('/api/issues', requireAuth, async (c) => {
  const body = await c.req.json();
  const { title, description, priority = 'medium' } = body;
  const user = c.get('user') as User;

  const result = db.prepare(`
    INSERT INTO issues (title, description, priority, author_id) VALUES (?, ?, ?, ?)
  `).run(title, description, priority, user.id);

  // Invalidate issues list
  hub.invalidate(['issues-list']);

  return c.json({ id: result.lastInsertRowid }, 201);
});

// Update issue
api.patch('/api/issues/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { title, description, status } = body;

  const updates: string[] = [];
  const values: any[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.prepare(`UPDATE issues SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  // Invalidate this issue and the issues list
  hub.invalidate([`issue:${id}`, 'issues-list']);

  return c.json({ success: true });
});

// Add label to issue
api.post('/api/issues/:id/labels/:labelId', requireAuth, (c) => {
  const issueId = c.req.param('id');
  const labelId = c.req.param('labelId');

  db.prepare(`
    INSERT OR IGNORE INTO issue_labels (issue_id, label_id) VALUES (?, ?)
  `).run(issueId, labelId);

  // Invalidate this issue and the issues list
  hub.invalidate([`issue:${issueId}`, 'issues-list']);

  return c.json({ success: true });
});

// Remove label from issue
api.delete('/api/issues/:id/labels/:labelId', requireAuth, (c) => {
  const issueId = c.req.param('id');
  const labelId = c.req.param('labelId');

  db.prepare(`
    DELETE FROM issue_labels WHERE issue_id = ? AND label_id = ?
  `).run(issueId, labelId);

  // Invalidate this issue and the issues list
  hub.invalidate([`issue:${issueId}`, 'issues-list']);

  return c.json({ success: true });
});

// Get all labels
api.get('/api/labels', (c) => {
  const labels = db.prepare('SELECT * FROM labels ORDER BY name').all();
  c.header('Cache-Tags', 'labels-list');
  return c.json(labels);
});

// Create new label
api.post('/api/labels', requireAuth, async (c) => {
  const body = await c.req.json();
  const { name, color } = body;

  const result = db.prepare(`
    INSERT INTO labels (name, color) VALUES (?, ?)
  `).run(name, color);

  // Invalidate labels list
  hub.invalidate(['labels-list']);

  return c.json({ id: result.lastInsertRowid }, 201);
});

// Add comment to issue
api.post('/api/issues/:id/comments', requireAuth, async (c) => {
  const issueId = c.req.param('id');
  const body = await c.req.json();
  const { content } = body;
  const user = c.get('user') as User;

  const result = db.prepare(`
    INSERT INTO comments (issue_id, author_id, content) VALUES (?, ?, ?)
  `).run(issueId, user.id, content);

  // Invalidate this issue (which includes comments)
  hub.invalidate([`issue:${issueId}`]);

  return c.json({ id: result.lastInsertRowid }, 201);
});

export default api;
