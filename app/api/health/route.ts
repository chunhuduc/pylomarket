import { NextResponse } from "next/server";
import { testHarperDBConnection, getHarperDBConnectionInfo } from "@/lib/harperdb-connection";

/**
 * Enhanced health check endpoint
 * Tests HarperDB connection and Application Resources availability
 */
export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      nextjs: {
        status: "ok",
        message: "Next.js API is running",
      },
      harperdb: {
        status: "unknown",
        connection: getHarperDBConnectionInfo(),
        message: "",
        resources: [] as string[],
      },
    },
    errors: [] as string[],
  };

  try {
    // Test HarperDB connection
    const harperdbConnected = await testHarperDBConnection();
    
    if (harperdbConnected) {
      health.services.harperdb.status = "ok";
      health.services.harperdb.message = "HarperDB is reachable";

      // Test Application Resources availability
      const resources = ["AuthResource", "WalletResource", "MarketResource", "OrderResource", "SolanaResource"];
      const resourceStatus: { [key: string]: boolean } = {};

      for (const resourceName of resources) {
        try {
          // Try to call the resource with a test action
          const response = await fetch(
            `${health.services.harperdb.connection.url}/${resourceName}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "test" }),
            }
          );

          // 404 means resource doesn't exist, 400/500 might mean it exists but test action is invalid
          resourceStatus[resourceName] = response.status !== 404;
        } catch (error) {
          resourceStatus[resourceName] = false;
        }
      }

      health.services.harperdb.resources = Object.entries(resourceStatus).map(
        ([name, available]) => `${name}: ${available ? "available" : "not found"}`
      );

      // Check if any resources are missing
      const missingResources = Object.entries(resourceStatus)
        .filter(([_, available]) => !available)
        .map(([name]) => name);

      if (missingResources.length > 0) {
        health.errors.push(
          `Application Resources not found: ${missingResources.join(", ")}. Make sure HarperDB Application is loaded (schema.graphql, resources.js, config.yaml).`
        );
      }
    } else {
      health.services.harperdb.status = "error";
      health.services.harperdb.message = "Cannot connect to HarperDB";
      health.errors.push(
        `HarperDB connection failed at ${health.services.harperdb.connection.url}. Make sure HarperDB container is running.`
      );
    }
  } catch (error) {
    health.services.harperdb.status = "error";
    health.services.harperdb.message = error instanceof Error ? error.message : "Unknown error";
    health.errors.push(`Health check error: ${health.services.harperdb.message}`);
  }

  // Overall status
  if (health.errors.length > 0) {
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : health.status === "degraded" ? 503 : 500;

  return NextResponse.json(health, { status: statusCode });
}
