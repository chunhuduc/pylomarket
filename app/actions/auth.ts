'use server';

/**
 * Authentication Server Actions
 * Replaces AuthResource from resources.js
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const SCHEMA = "pylomarket";

// Declare global harperdb type
declare global {
  var harperdb: any;
}

export async function registerUser(email: string, password: string, username: string) {
  try {
    // Check if user exists
    const existingUsers = await harperdb.searchByValue(
      SCHEMA,
      "users",
      "email",
      email
    );

    if (existingUsers && existingUsers.length > 0) {
      return { success: false, error: "User with this email already exists" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id: userId,
      email,
      username,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await harperdb.insert(SCHEMA, "users", [user]);

    // Create wallet and balance
    const walletId = `wallet_${userId}`;
    await harperdb.insert(SCHEMA, "wallets", [{
      id: walletId,
      user_id: userId,
      solana_address: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);

    await harperdb.insert(SCHEMA, "balances", [{
      id: `balance_${userId}`,
      user_id: userId,
      balance: 0,
      currency: "USD",
      updated_at: new Date().toISOString(),
    }]);

    return { success: true, userId, message: "User registered successfully" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const users = await harperdb.searchByValue(
      SCHEMA,
      "users",
      "email",
      email
    );

    if (!users || users.length === 0) {
      return { success: false, error: "Invalid credentials" };
    }

    const user = users[0];
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
