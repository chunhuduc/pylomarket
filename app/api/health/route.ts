import { NextResponse } from "next/server";

/**
 * Health check endpoint
 * Tests basic server status
 */
export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      nextjs: {
        status: "ok",
        message: "Next.js server is running",
      },
      harperdb: {
        status: "ok",
        message: "HarperDB integrated via @harperdb/nextjs",
      },
    },
  };

  return NextResponse.json(health);
}
