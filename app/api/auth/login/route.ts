import { NextRequest, NextResponse } from "next/server";
import { authFunctions } from "@/lib/harperdb-functions";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );
    }

    // Call HarperDB custom function
    const result = await authFunctions.login({ email, password });

    if (!result.success) {
      // Enhanced error logging in development
      if (process.env.NODE_ENV === "development") {
        console.error("[API /auth/login] HarperDB error:", result.error);
      }

      // Don't expose detailed errors for security, but log them
      const isAuthError = result.error?.includes("Invalid") || result.error?.includes("not found");
      
      return NextResponse.json(
        {
          error: isAuthError ? "Invalid credentials" : result.error || "Login failed",
          ...(process.env.NODE_ENV === "development" && !isAuthError && {
            debug: {
              message: "Check if HarperDB custom function 'auth' is available",
            },
          }),
        },
        { status: isAuthError ? 401 : 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    
    if (process.env.NODE_ENV === "development") {
      console.error("[API /auth/login] Unexpected error:", error);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          debug: {
            stack: error instanceof Error ? error.stack : undefined,
          },
        }),
      },
      { status: 500 }
    );
  }
}
