import { NextRequest, NextResponse } from "next/server";

function getBaseUrl(request: NextRequest) {
  // Prefer forwarded headers when behind a proxy (HarperDB/Next integration often proxies :9926 -> :3000)
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  const url = new URL(request.url);
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  const host = forwardedHost ?? request.headers.get("host") ?? url.host;

  return `${proto}://${host}`;
}

function safeInternalPath(path: string | null): string {
  if (!path) return "/";
  if (!path.startsWith("/")) return "/";
  // prevent protocol-relative //evil.com
  if (path.startsWith("//")) return "/";
  return path;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Missing GOOGLE_CLIENT_ID" },
      { status: 500 }
    );
  }

  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const state = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const returnTo = safeInternalPath(request.nextUrl.searchParams.get("returnTo"));

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });
  res.cookies.set("google_oauth_returnTo", returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("[Google OAuth] redirect_uri:", redirectUri);
  }

  return res;
}

