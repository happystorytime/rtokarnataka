import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db, logActivity } from './db.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface AuthenticatedRequest extends Request {
  adminUser?: {
    username: string;
    lastLoginAt: string | null;
  };
  sessionToken?: string;
}

/**
 * Check if the owner master account has been initialized
 */
export function isInitialized(): boolean {
  const row = db.prepare('SELECT id, username FROM admin_auth WHERE id = 1').get() as { id: number; username: string } | undefined;
  return !!row;
}

/**
 * First-time setup: Create the single master administrator account
 */
export async function setupAdmin(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (isInitialized()) {
    return { success: false, error: 'Master administrator account is already configured.' };
  }

  const cleanUser = username?.trim();
  const cleanPass = password?.trim();

  if (!cleanUser || cleanUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }
  if (!cleanPass || cleanPass.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  const passwordHash = await bcrypt.hash(cleanPass, 12);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO admin_auth (id, username, password_hash, failed_attempts, locked_until, created_at, updated_at)
    VALUES (1, ?, ?, 0, NULL, ?, ?)
  `);

  stmt.run(cleanUser, passwordHash, now, now);
  logActivity('ADMIN_SETUP', 'AUTH', '1', `Master administrator initialized with username: ${cleanUser}`);

  return { success: true };
}

/**
 * Authenticate single owner administrator
 */
export async function authenticateAdmin(
  username: string,
  pass: string,
  ip?: string,
  userAgent?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const admin = db.prepare('SELECT * FROM admin_auth WHERE id = 1').get() as any;

  if (!admin) {
    return { success: false, error: 'System is not yet initialized. Please complete initial setup.' };
  }

  const now = new Date();

  // Check lockout
  if (admin.locked_until) {
    const lockTime = new Date(admin.locked_until);
    if (lockTime > now) {
      const waitMinutes = Math.ceil((lockTime.getTime() - now.getTime()) / 60000);
      return {
        success: false,
        error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${waitMinutes} minute(s).`
      };
    } else {
      // Lock expired, reset
      db.prepare('UPDATE admin_auth SET failed_attempts = 0, locked_until = NULL WHERE id = 1').run();
    }
  }

  const cleanUser = username?.trim();
  const cleanPass = pass?.trim();

  // Verify username
  if (cleanUser.toLowerCase() !== admin.username.toLowerCase()) {
    recordFailedAttempt(admin);
    return { success: false, error: 'Invalid administrator credentials.' };
  }

  // Verify password
  const isValid = await bcrypt.compare(cleanPass, admin.password_hash);
  if (!isValid) {
    recordFailedAttempt(admin);
    return { success: false, error: 'Invalid administrator credentials.' };
  }

  // Success: reset failed attempts and generate secure session
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  const insertSession = db.prepare(`
    INSERT INTO admin_sessions (token, created_at, expires_at, ip, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertSession.run(token, now.toISOString(), expiresAt, ip || null, userAgent || null);

  db.prepare(`
    UPDATE admin_auth 
    SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ?
    WHERE id = 1
  `).run(now.toISOString(), now.toISOString());

  logActivity('ADMIN_LOGIN', 'AUTH', '1', `Successful login by ${admin.username} from ${ip || 'unknown'}`);

  return { success: true, token };
}

function recordFailedAttempt(admin: any) {
  const newAttempts = (admin.failed_attempts || 0) + 1;
  const now = new Date();
  let lockedUntil: string | null = null;

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
  }

  db.prepare(`
    UPDATE admin_auth 
    SET failed_attempts = ?, locked_until = ?, updated_at = ?
    WHERE id = 1
  `).run(newAttempts, lockedUntil, now.toISOString());

  logActivity('LOGIN_FAILED', 'AUTH', '1', `Failed login attempt (${newAttempts}/${MAX_FAILED_ATTEMPTS})`);
}

/**
 * Middleware: Verify admin session token
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  } else if (req.query?.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const session = db.prepare(`
    SELECT * FROM admin_sessions WHERE token = ?
  `).get(token) as any;

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    return res.status(401).json({ error: 'Session has expired. Please log in again.' });
  }

  const admin = db.prepare('SELECT username, last_login_at FROM admin_auth WHERE id = 1').get() as any;

  req.adminUser = {
    username: admin.username,
    lastLoginAt: admin.last_login_at
  };
  req.sessionToken = token;

  next();
}

/**
 * Invalidate session on logout
 */
export function logoutAdmin(token: string) {
  if (token) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    logActivity('ADMIN_LOGOUT', 'AUTH', '1', 'Admin session logged out');
  }
}

/**
 * Update master password
 */
export async function updatePassword(oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> {
  const admin = db.prepare('SELECT * FROM admin_auth WHERE id = 1').get() as any;
  if (!admin) {
    return { success: false, error: 'System not initialized.' };
  }

  const isOldValid = await bcrypt.compare(oldPass, admin.password_hash);
  if (!isOldValid) {
    return { success: false, error: 'Current password is incorrect.' };
  }

  if (!newPass || newPass.trim().length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }

  const newHash = await bcrypt.hash(newPass.trim(), 12);
  const now = new Date().toISOString();

  db.prepare('UPDATE admin_auth SET password_hash = ?, updated_at = ? WHERE id = 1').run(newHash, now);
  // Clear all other sessions except current if any
  db.prepare('DELETE FROM admin_sessions').run();

  logActivity('PASSWORD_CHANGED', 'AUTH', '1', 'Master administrator password updated');

  return { success: true };
}
