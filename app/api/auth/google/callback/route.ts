import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";
import { databases } from "harperdb";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function getBaseUrl(request: NextRequest) {
  // Prefer forwarded headers when behind a proxy (HarperDB/Next integration often proxies :9926 -> :3000)
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  const url = new URL(request.url);
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  const host = forwardedHost ?? request.headers.get("host") ?? url.host;

  return `${proto}://${host}`;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

async function findUserByEmail(email: string) {
  const { User } = databases.pylomarket;
  const query: any = {
    conditions: [{ attribute: "email", value: email }],
    limit: 1,
  };

  for await (const record of (User as any).search(query)) {
    return record as any;
  }

  return null;
}

async function createUserWithWalletAndBalance(email: string, username: string) {
  const { User, Wallet, Balance } = databases.pylomarket;

  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const userData = {
    id: userId,
    email,
    username,
    password_hash: "", // OAuth-based auth
    created_at: now,
    updated_at: now,
  };

  console.log("[Google OAuth] creating user:", { userId, email });
  await (User as any).create(userData);

  const walletId = `wallet_${userId}`;
  await (Wallet as any).create({
    id: walletId,
    user_id: userId,
    solana_address: "",
    created_at: now,
    updated_at: now,
  });

  await (Balance as any).create({
    id: `balance_${userId}`,
    user_id: userId,
    balance: 0,
    currency: "USD",
    updated_at: now,
  });

  return { id: userId, email, username };
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const redirectToCallbackPage = (params: Record<string, string>) => {
    const target = new URL(`${baseUrl}/auth/google/callback`);
    for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
    return NextResponse.redirect(target);
  };

  if (error) {
    console.error("[Google OAuth] provider error:", error);
    return redirectToCallbackPage({ error });
  }

  if (!clientId || !clientSecret) {
    console.error("[Google OAuth] missing env vars");
    return redirectToCallbackPage({ error: "missing_google_oauth_env" });
  }

  if (!code || !state) {
    return redirectToCallbackPage({ error: "missing_code_or_state" });
  }

  const cookieState = request.cookies.get("google_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    console.error("[Google OAuth] state mismatch", { cookieState, state });
    return redirectToCallbackPage({ error: "invalid_state" });
  }

  try {
    console.log("[Google OAuth] exchanging code for token...");
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenJson: any = await tokenRes.json().catch(() => null);
    if (!tokenRes.ok || !tokenJson?.access_token) {
      console.error("[Google OAuth] token exchange failed", {
        status: tokenRes.status,
        body: tokenJson,
      });
      return redirectToCallbackPage({ error: "token_exchange_failed" });
    }

    console.log("[Google OAuth] fetching userinfo...");
    const userinfoRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      }
    );
    const userinfo: any = await userinfoRes.json().catch(() => null);
    if (!userinfoRes.ok || !userinfo?.email) {
      console.error("[Google OAuth] userinfo failed", {
        status: userinfoRes.status,
        body: userinfo,
      });
      return redirectToCallbackPage({ error: "userinfo_failed" });
    }

    const email = String(userinfo.email).toLowerCase();
    const suggestedUsername =
      (userinfo.given_name && String(userinfo.given_name)) ||
      (userinfo.name && String(userinfo.name).split(" ")[0]) ||
      email.split("@")[0] ||
      `user_${Date.now()}`;

    console.log("[Google OAuth] resolved identity:", { email });

    let userRecord = await findUserByEmail(email);
    let user: { id: string; email: string; username: string };

    if (!userRecord) {
      user = await createUserWithWalletAndBalance(email, suggestedUsername);
    } else {
      user = {
        id: userRecord.id,
        email: userRecord.email,
        username: userRecord.username,
      };
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Clear state cookies
    const res = redirectToCallbackPage({
      token,
      user: base64UrlEncode(JSON.stringify(user)),
      returnTo: request.cookies.get("google_oauth_returnTo")?.value || "/",
    });
    res.cookies.set("google_oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("google_oauth_returnTo", "", { path: "/", maxAge: 0 });

    return res;
  } catch (e) {
    console.error("[Google OAuth] unexpected error:", e);
    return redirectToCallbackPage({ error: "oauth_unexpected_error" });
  }
}

