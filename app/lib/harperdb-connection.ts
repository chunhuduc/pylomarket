/**
 * Auto-detect HarperDB connection URL for development
 * Supports both localhost (when HarperDB runs in Docker) and container network
 */

function detectHarperDBUrl(): string {
  // Priority 1: Explicit environment variable
  if (process.env.HARPERDB_URL) {
    return process.env.HARPERDB_URL;
  }

  // Priority 2: Public environment variable (for client-side)
  if (process.env.NEXT_PUBLIC_HARPERDB_URL) {
    return process.env.NEXT_PUBLIC_HARPERDB_URL;
  }

  // Priority 3: Auto-detect based on environment
  if (process.env.NODE_ENV === "development") {
    // In dev mode, try to connect to HarperDB container
    // First try container network name, then localhost
    const containerUrl = "http://harperdb:9925";
    const localhostUrl = "http://localhost:9925";

    // Return localhost for dev (HarperDB container exposes port 9925)
    // If running in same network, can use containerUrl
    return process.env.HARPERDB_CONTAINER_NAME ? containerUrl : localhostUrl;
  }

  // Production default
  return "http://localhost:9925";
}

export const HARPERDB_URL = detectHarperDBUrl();

/**
 * Test HarperDB connection
 */
export async function testHarperDBConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${HARPERDB_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${process.env.HARPERDB_USERNAME || "HDB_ADMIN"}:${process.env.HARPERDB_PASSWORD || "password"}`
        ).toString("base64")}`,
      },
      body: JSON.stringify({ operation: "describe_all" }),
    });

    return response.ok;
  } catch (error) {
    console.error("HarperDB connection test failed:", error);
    return false;
  }
}

/**
 * Get HarperDB connection info (for debugging)
 */
export function getHarperDBConnectionInfo() {
  return {
    url: HARPERDB_URL,
    environment: process.env.NODE_ENV,
    isContainerNetwork: HARPERDB_URL.includes("harperdb:"),
    isLocalhost: HARPERDB_URL.includes("localhost"),
  };
}
