/**
 * Authentication Helper Functions
 * Utilities for handling HttpOnly cookies-based authentication
 */

import { cookies } from 'next/headers';
import { decodeToken, JWTPayload } from './jwt';

const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface CurrentUser {
  userId: string;
  email: string;
}

/**
 * Get current authenticated user from HttpOnly cookie
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return null;
    }

    const payload = decodeToken(token);
    if (!payload) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch (error) {
    console.error('[ERROR] getCurrentUser:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if user is not authenticated
 * Returns current user if authenticated
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Set authentication token as HttpOnly cookie
 * Should be called from Server Actions or API routes
 */
export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear authentication token cookie
 * Should be called from Server Actions or API routes
 */
export async function clearAuthToken(): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.delete(COOKIE_NAME);
}
