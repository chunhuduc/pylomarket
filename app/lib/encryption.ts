/**
 * Encryption Utility
 * Used to encrypt/decrypt sensitive data like private keys
 */

import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "your-encryption-key-change-in-production";
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is 12, but we'll use 16 for compatibility
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Derive a 32-byte key from the encryption key using PBKDF2
 */
function getKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');
}

/**
 * Encrypt text using AES-256-GCM
 * Returns base64 encoded string: salt + iv + tag + encryptedData
 */
export function encrypt(text: string): string {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey(salt);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    // Combine: salt + iv + tag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt text using AES-256-GCM
 * Expects base64 encoded string: salt + iv + tag + encryptedData
 */
export function decrypt(encryptedText: string): string {
  try {
    // Validate input
    if (!encryptedText || typeof encryptedText !== 'string' || encryptedText.trim() === '') {
      throw new Error('Encrypted text is empty or invalid');
    }

    const combined = Buffer.from(encryptedText, 'base64');
    
    // Validate buffer length (should be at least SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
    if (combined.length < minLength) {
      throw new Error(`Encrypted data too short. Expected at least ${minLength} bytes, got ${combined.length}`);
    }
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(TAG_POSITION, TAG_POSITION + TAG_LENGTH);
    const encrypted = combined.subarray(ENCRYPTED_POSITION);
    
    // Validate encrypted data exists
    if (encrypted.length === 0) {
      throw new Error('No encrypted data found');
    }
    
    const key = getKey(salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    // Provide more detailed error message
    if (error.message.includes('unable to authenticate') || error.message.includes('Unsupported state')) {
      throw new Error(`Decryption authentication failed. This usually means the encryption key has changed or the data is corrupted. Original error: ${error.message}`);
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}
