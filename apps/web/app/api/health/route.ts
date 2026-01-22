import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Basic health check
    // You can add more checks here (database connection, etc.)
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "pylomarket-api",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
