import type { Context, Next } from 'hono';
import { verifyToken, extractTokenFromHeader } from './utils.js';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AuthenticatedUser } from '../types/auth.js';

export interface AuthVariables {
  user: AuthenticatedUser;
}

export async function authMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Get user from database
    const userResult = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
    }).from(users).where(eq(users.id, payload.userId)).limit(1);

    if (userResult.length === 0) {
      return c.json({ error: 'User not found' }, 401);
    }

    const user = userResult[0];
    c.set('user', user);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
}

export async function optionalAuthMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const userResult = await db.select({
          id: users.id,
          email: users.email,
          name: users.name,
        }).from(users).where(eq(users.id, payload.userId)).limit(1);

        if (userResult.length > 0) {
          c.set('user', userResult[0]);
        }
      }
    }

    await next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    await next();
  }
}
