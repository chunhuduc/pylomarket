/**
 * JWT Helper Functions
 * Utilities for decoding and verifying JWT tokens
 */

import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Decode JWT token and extract user information
 * Returns null if token is invalid
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract user ID from JWT token
 * Returns null if token is invalid
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeToken(token);
  return payload?.userId || null;
}

/**
 * Extract user email from JWT token
 * Returns null if token is invalid
 */
export function getEmailFromToken(token: string): string | null {
  const payload = decodeToken(token);
  return payload?.email || null;
}
