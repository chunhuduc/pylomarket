import { NextRequest, NextResponse } from "next/server";
import { insert, searchByValue } from "@/lib/harperdb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUsers = await searchByValue("users", "email", email, ["id"]);

    if (existingUsers.data && existingUsers.data.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const user = {
      id: userId,
      email,
      username,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await insert("users", [user]);

    // Create initial balance
    await insert("balances", [
      {
        id: `balance_${userId}`,
        user_id: userId,
        balance: 0,
        currency: "USD",
        updated_at: new Date().toISOString(),
      },
    ]);

    // Generate token
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });

    return NextResponse.json({
      success: true,
      user: { id: userId, email, username },
      token,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}
