import { NextRequest, NextResponse } from "next/server";
import { databases } from "harperdb";
import { completeUserLogin } from "@/actions/auth";

const { User } = databases.pylomarket;

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
  const query: any = {
    conditions: [{ attribute: "email", value: email }],
    limit: 1,
  };

  for await (const record of (User as any).search(query)) {
    return record as any;
  }

  return null;
}

async function createUser(email: string, username: string) {
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

    // Check if user exists or create new user
    let userRecord = await findUserByEmail(email);
    let user: { id: string; email: string; username: string };

    if (!userRecord) {
      // Create new user (wallet will be created in completeUserLogin)
      user = await createUser(email, suggestedUsername);
      console.log("[Google OAuth] new user created:", { userId: user.id });
    } else {
      // User exists
      user = {
        id: userRecord.id,
        email: userRecord.email,
        username: userRecord.username,
      };
      console.log("[Google OAuth] existing user found:", { userId: user.id });
    }

    // Complete login flow (ensure wallet + generate token)
    const loginResult = await completeUserLogin(user.id, user.email, user.username);
    
    if (!loginResult.success || !loginResult.token || !loginResult.user) {
      console.error("[Google OAuth] failed to complete login:", loginResult.error);
      return redirectToCallbackPage({ error: "login_completion_failed" });
    }

    // Clear state cookies
    const res = redirectToCallbackPage({
      token: loginResult.token,
      user: base64UrlEncode(JSON.stringify(loginResult.user)),
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

