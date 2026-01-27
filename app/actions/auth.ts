'use server';

/**
 * Authentication Server Actions
 * Replaces AuthResource from resources.js
 */

import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { databases, RequestTarget } from "harperdb";
import { generateOTP, setOTP, getOTP, deleteOTP } from './otp-store';
import { sendEmail, generateOTPEmailTemplate } from '../lib/email';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Extract tables from databases
const { User, Wallet, Balance } = databases.pylomarket;

async function findFirstByFilter<T>(table: any, filter: Record<string, any>): Promise<T | null> {
  for await (const record of table.get(filter )) {
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

    // Create wallet and balance
    const walletId = `wallet_${userId}`;
    await (Wallet as any).create({
      id: walletId,
      user_id: userId,
      solana_address: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await (Balance as any).create({
      id: `balance_${userId}`,
      user_id: userId,
      balance: 0,
      currency: "USD",
      updated_at: new Date().toISOString(),
    });

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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, user: decoded };
  } catch (error: any) {
    return { success: false, error: "Invalid token" };
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

    // Create wallet
    const walletId = `wallet_${userId}`;
    console.log('[DEBUG] createUserWithWallet: Creating wallet with id:', walletId);
    await (Wallet as any).create({
      id: walletId,
      user_id: userId,
      solana_address: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log('[DEBUG] createUserWithWallet: Wallet created successfully');

    // Create balance
    const balanceId = `balance_${userId}`;
    console.log('[DEBUG] createUserWithWallet: Creating balance with id:', balanceId);
    await (Balance as any).create({
      id: balanceId,
      user_id: userId,
      balance: 0,
      currency: "USD",
      updated_at: new Date().toISOString(),
    });
    console.log('[DEBUG] createUserWithWallet: Balance created successfully');

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

    // Generate JWT token
    console.log('[DEBUG] verifyEmailCode: Generating JWT token...');
    const token = jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log('[DEBUG] verifyEmailCode: JWT token generated successfully');

    console.log('[DEBUG] verifyEmailCode: Verification completed successfully');
    
    return {
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        id: userId,
        email,
        username,
      },
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
