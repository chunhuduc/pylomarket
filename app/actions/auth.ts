'use server';

/**
 * Authentication Server Actions
 * Replaces AuthResource from resources.js
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { databases } from "harperdb";
import { generateOTP, setOTP, getOTP, deleteOTP } from './otp-store';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Extract tables from databases
const { User, Wallet, Balance } = databases.pylomarket;

export async function registerUser(email: string, password: string, username: string) {
  try {
    // Check if user exists using Resource API
    const filter: any = { email };
    const existingUsersArray = [];
    for await (const user of User.search(filter)) {
      existingUsersArray.push(user);
    }

    if (existingUsersArray.length > 0) {
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
    const filter: any = { email };
    const usersArray = [];
    for await (const user of User.search(filter)) {
      usersArray.push(user);
    }

    if (usersArray.length === 0) {
      return { success: false, error: "Invalid credentials" };
    }

    // Convert HarperDB object to plain object
    const user = {
      id: usersArray[0].id,
      email: usersArray[0].email,
      username: usersArray[0].username,
      password_hash: usersArray[0].password_hash,
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

    // Store OTP (expires in 10 minutes)
    setOTP(email, code, 10);

    // In production, send email here using a service like SendGrid, AWS SES, etc.
    // For now, log it to console (remove in production)
    console.log(`[DEV] Verification code for ${email}: ${code}`);

    // TODO: Send email with OTP
    // await sendEmail({
    //   to: email,
    //   subject: "PyloMarket Verification Code",
    //   html: `Your verification code is: <strong>${code}</strong>`
    // });

    return {
      success: true,
      message: "Verification code sent to your email",
    };
  } catch (error: any) {
    return { success: false, error: "Failed to send verification code" };
  }
}

export async function verifyEmailCode(email: string, code: string) {
  try {
    if (!email || !code) {
      return { success: false, error: "Email and code are required" };
    }

    // Get stored OTP
    const storedCode = getOTP(email);

    if (!storedCode) {
      return {
        success: false,
        error: "Verification code expired or not found. Please request a new code.",
      };
    }

    // Verify code
    if (storedCode !== code) {
      return { success: false, error: "Invalid verification code" };
    }

    // Code is valid, delete it
    deleteOTP(email);

    // In production, you might want to:
    // 1. Mark email as verified in database
    // 2. Create a session/token for verified email
    // 3. Store verification status temporarily

    return {
      success: true,
      message: "Email verified successfully",
    };
  } catch (error: any) {
    return { success: false, error: "Failed to verify email" };
  }
}
