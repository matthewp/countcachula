import jwt from 'jsonwebtoken';
import type { Context, Next } from 'hono';
import db from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export interface User {
  id: number;
  github_id: number;
  username: string;
  name: string | null;
  avatar_url: string | null;
}

export interface JWTPayload {
  userId: number;
  username: string;
}

// Create or update user from GitHub profile
export function createOrUpdateUser(githubUser: any): User {
  const existing = db.prepare('SELECT * FROM users WHERE github_id = ?').get(githubUser.id) as User | undefined;

  if (existing) {
    // Update existing user
    db.prepare(`
      UPDATE users
      SET username = ?, name = ?, avatar_url = ?
      WHERE github_id = ?
    `).run(githubUser.login, githubUser.name, githubUser.avatar_url, githubUser.id);

    return {
      ...existing,
      username: githubUser.login,
      name: githubUser.name,
      avatar_url: githubUser.avatar_url,
    };
  } else {
    // Create new user
    const result = db.prepare(`
      INSERT INTO users (github_id, username, name, avatar_url)
      VALUES (?, ?, ?, ?)
    `).run(githubUser.id, githubUser.login, githubUser.name, githubUser.avatar_url);

    return {
      id: result.lastInsertRowid as number,
      github_id: githubUser.id,
      username: githubUser.login,
      name: githubUser.name,
      avatar_url: githubUser.avatar_url,
    };
  }
}

// Generate JWT token
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Get user from token
export function getUserFromToken(token: string): User | null {
  const payload = verifyToken(token);
  if (!payload) return null;

  return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as User | null;
}

// Authentication middleware
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token) {
    const user = getUserFromToken(token);
    if (user) {
      c.set('user', user);
    }
  }

  await next();
}

// Require authentication middleware
export async function requireAuth(c: Context, next: Next) {
  const user = c.get('user') as User | undefined;

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  await next();
}

// GitHub OAuth functions
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

export async function getGitHubUser(accessToken: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'CountCachula-BugTracker',
    },
  });

  return response.json();
}