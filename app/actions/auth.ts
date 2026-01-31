'use server';

/**
 * Authentication Server Actions
 * Replaces AuthResource from resources.js
 */

import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { databases } from "harperdb";
import { generateOTP, setOTP, getOTP, deleteOTP } from './otp-store';
import { sendEmail, generateOTPEmailTemplate } from '../lib/email';
import { ensureWalletExists } from './wallet';
import { setAuthToken, clearAuthToken, getCurrentUser as getCurrentUserFromCookie } from '../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Extract tables from databases
const { User, Wallet } = databases.pylomarket;

async function findFirstByFilter<T>(table: any, filter: Record<string, any>): Promise<T | null> {
  const query = {
    conditions: Object.entries(filter).map(([attribute, value]) => ({ attribute, value })),
    limit: 1,
  };

  for await (const record of table.search(query)) {
    return record as T;
  }
  return null;
}

export async function registerUser(email: string, password: string, username: string) {
  try {
    // Check if user exists using Resource API
    const existingUser = await findFirstByFilter<any>(User, { email } as any);
    if (existingUser) {
      return { success: false, error: "User with this email already exists" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userData = {
      id: userId,
      email,
      username,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await (User as any).create(userData);

    // Wallet and balance will be created when user sets up wallet in wallet management page
    // No longer creating wallet automatically during registration

    return { success: true, userId, message: "User registered successfully" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(email: string, password: string) {
  try {
    // Search users by email using Resource API
    const foundUser = await findFirstByFilter<any>(User, { email } as any);
    if (!foundUser) {
      return { success: false, error: "Invalid credentials" };
    }

    // Convert HarperDB object to plain object
    const user = {
      id: foundUser.id,
      email: foundUser.email,
      username: foundUser.username,
      password_hash: foundUser.password_hash,
    };

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return { success: false, error: "Invalid credentials" };
    }

    // Complete login flow (ensure wallet + generate token)
    const loginResult = await completeUserLogin(user.id, user.email, user.username);
    
    if (!loginResult.success) {
      return {
        success: false,
        error: loginResult.error || 'Failed to complete login',
      };
    }

    return {
      success: true,
      token: loginResult.token,
      user: loginResult.user,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


/**
 * OTP Verification Server Actions
 * For email verification flow
 */

export async function sendVerificationCode(email: string) {
  try {
    if (!email) {
      return { success: false, error: "Email is required" };
    }

    // Generate OTP
    const code = generateOTP();

    // Store OTP (expires in 20 minutes to match email template)
    setOTP(email, code, 20);

    // Generate email template (Polymarket style)
    const emailHtml = generateOTPEmailTemplate(code, 20);

    // Send email with OTP
    await sendEmail({
      to: email,
      subject: "PyloMarket Login Code",
      html: emailHtml,
    });

    return {
      success: true,
      message: "Verification code sent to your email",
    };
  } catch (error: any) {
    return { success: false, error: "Failed to send verification code" };
  }
}

/**
 * Create a new user with wallet and balance
 * Extracted from verifyEmailCode for better separation of concerns
 */
async function createUserWithWallet(email: string) {
  console.log('[DEBUG] createUserWithWallet: Starting user creation for email:', email);
  
  try {
    // Generate user ID and username
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const username = email.split('@')[0] || `user_${Date.now()}`;
    
    console.log('[DEBUG] createUserWithWallet: Generated userId:', userId, 'username:', username);
    
    // Create user without password (OTP-based auth)
    const userData = {
      id: userId,
      email,
      username,
      password_hash: '', // No password for OTP-based auth
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[DEBUG] createUserWithWallet: Creating user in database...');
    await (User as any).create(userData);
    console.log('[DEBUG] createUserWithWallet: User created successfully');

    // Wallet and balance will be created when user sets up wallet in wallet management page
    // No longer creating wallet automatically during registration

    return { userId, username };
  } catch (error: any) {
    console.error('[ERROR] createUserWithWallet: Failed to create user:', error);
    console.error('[ERROR] createUserWithWallet: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error;
  }
}

/**
 * Complete user login flow - common function for all login methods
 * This ensures wallet exists and generates JWT token
 * Called after user is confirmed to exist (either newly created or existing)
 */
export async function completeUserLogin(userId: string, email: string, username: string) {
  console.log('[DEBUG] completeUserLogin: Starting for user:', { userId, email });
  
  try {
    // Ensure wallet exists for user (auto-create if not exists)
    console.log('[DEBUG] completeUserLogin: Ensuring wallet exists...');
    const walletResult = await ensureWalletExists(userId);
    if (walletResult.success && walletResult.created) {
      console.log('[DEBUG] completeUserLogin: Wallet created successfully');
    } else if (walletResult.success) {
      console.log('[DEBUG] completeUserLogin: Wallet already exists');
    } else {
      console.warn('[WARN] completeUserLogin: Failed to ensure wallet exists:', walletResult.error);
      // Continue anyway - wallet can be created later
    }

    // Generate JWT token
    console.log('[DEBUG] completeUserLogin: Generating JWT token...');
    const token = jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log('[DEBUG] completeUserLogin: JWT token generated successfully');

    // Set HttpOnly cookie
    console.log('[DEBUG] completeUserLogin: Setting auth cookie...');
    await setAuthToken(token);
    console.log('[DEBUG] completeUserLogin: Auth cookie set successfully');

    console.log('[DEBUG] completeUserLogin: Login completed successfully');
    
    return {
      success: true,
      token, // Keep token in response for backward compatibility
      user: {
        id: userId,
        email,
        username,
      },
    };
  } catch (error: any) {
    console.error('[ERROR] completeUserLogin: Failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to complete login',
    };
  }
}

/**
 * Check if user exists by email
 */
async function findUserByEmail(email: string) {
  console.log('[DEBUG] findUserByEmail: Searching for user with email:', email);
  
  try {
    const filter: any = { email };
    console.log('[DEBUG] findUserByEmail: Query conditions:', [
      { attribute: 'email', comparator: 'equals', value: email },
    ]);
    const user = await findFirstByFilter<any>(User, filter);

    console.log('[DEBUG] findUserByEmail: Found', user ? 1 : 0, 'user(s)');

    if (user) {
      console.log('[DEBUG] findUserByEmail: User exists with id:', user.id);
      return {
        exists: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
    }
    
    console.log('[DEBUG] findUserByEmail: User does not exist');
    return { exists: false, user: null };
  } catch (error: any) {
    console.error('[ERROR] findUserByEmail: Failed to search user:', error);
    throw error;
  }
}

/**
 * Verify OTP and automatically create/login user
 * This handles both registration and login flow
 */
export async function verifyEmailCode(email: string, code: string) {
  console.log('[DEBUG] verifyEmailCode: Starting verification for email:', email);
  
  try {
    // Validate input
    if (!email || !code) {
      console.log('[DEBUG] verifyEmailCode: Missing email or code');
      return { success: false, error: "Email and code are required" };
    }

    // Get stored OTP
    console.log('[DEBUG] verifyEmailCode: Retrieving stored OTP...');
    const storedCode = getOTP(email);

    if (!storedCode) {
      console.log('[DEBUG] verifyEmailCode: No stored OTP found for email:', email);
      return {
        success: false,
        error: "Verification code expired or not found. Please request a new code.",
      };
    }

    console.log('[DEBUG] verifyEmailCode: Stored OTP found, verifying code...');
    
    // Verify code
    if (storedCode !== code) {
      console.log('[DEBUG] verifyEmailCode: Code mismatch. Expected:', storedCode, 'Received:', code);
      return { success: false, error: "Invalid verification code" };
    }

    console.log('[DEBUG] verifyEmailCode: Code verified successfully');
    
    // Code is valid, delete it
    deleteOTP(email);
    console.log('[DEBUG] verifyEmailCode: OTP deleted from store');

    // Check if user exists
    const userResult = await findUserByEmail(email);

    let userId: string;
    let username: string;

    if (!userResult.exists) {
      console.log('[DEBUG] verifyEmailCode: User does not exist, creating new account...');
      
      // User doesn't exist, create new account
      const newUser = await createUserWithWallet(email);
      userId = newUser.userId;
      username = newUser.username;
      
      console.log('[DEBUG] verifyEmailCode: New user created with id:', userId);
    } else {
      // User exists, use existing data
      console.log('[DEBUG] verifyEmailCode: User exists, using existing account');
      userId = userResult.user!.id;
      username = userResult.user!.username;
      console.log('[DEBUG] verifyEmailCode: Using existing user id:', userId);
    }

    // Complete login flow (ensure wallet + generate token)
    const loginResult = await completeUserLogin(userId, email, username);
    
    if (!loginResult.success) {
      return {
        success: false,
        error: loginResult.error || 'Failed to complete login',
      };
    }

    console.log('[DEBUG] verifyEmailCode: Verification completed successfully');
    
    return {
      success: true,
      message: "Email verified successfully",
      token: loginResult.token,
      user: loginResult.user,
    };
  } catch (error: any) {
    console.error('[ERROR] verifyEmailCode: Failed to verify email:', error);
    console.error('[ERROR] verifyEmailCode: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      email,
    });
    return { 
      success: false, 
      error: `Failed to verify email: ${error.message || 'Unknown error'}` 
    };
  }
}

/**
 * Logout user by clearing authentication cookie
 */
export async function logout() {
  try {
    await clearAuthToken();
    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error: any) {
    console.error('[ERROR] logout: Failed to logout:', error);
    return {
      success: false,
      error: error.message || 'Failed to logout',
    };
  }
}

/**
 * Get current authenticated user info
 * Returns null if not authenticated
 */
export async function getCurrentUserInfo() {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user) {
      return { success: false, user: null };
    }
    
    // Get username from database
    const foundUser = await findFirstByFilter<any>(User, { id: user.userId } as any);
    if (!foundUser) {
      return { success: false, user: null };
    }
    
    return {
      success: true,
      user: {
        id: foundUser.id,
        email: foundUser.email,
        username: foundUser.username,
      },
    };
  } catch (error: any) {
    console.error('[ERROR] getCurrentUserInfo:', error);
    return { success: false, user: null };
  }
}
