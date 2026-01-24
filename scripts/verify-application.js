/**
 * Verify HarperDB 4.7 Application Resources
 * Checks if all Resources are available and working
 */

const HARPERDB_URL = process.env.HARPERDB_URL || "http://localhost:9925";

const requiredResources = [
  "AuthResource",
  "WalletResource",
  "MarketResource",
  "OrderResource",
  "SolanaResource",
];

/**
 * Test if a Resource is available
 */
async function testResource(resourceName) {
  try {
    const response = await fetch(`${HARPERDB_URL}/${resourceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "test",
      }),
    });

    // 404 means resource doesn't exist
    // 400/500 might mean it exists but test action is invalid (which is OK)
    return response.status !== 404;
  } catch (error) {
    return false;
  }
}

/**
 * Main verification
 */
async function verify() {
  console.log("🔧 Verifying HarperDB 4.7 Application Resources...\n");
  console.log(`🔗 HarperDB URL: ${HARPERDB_URL}\n`);

  let allAvailable = true;

  for (const resourceName of requiredResources) {
    const isAvailable = await testResource(resourceName);

    if (isAvailable) {
      console.log(`  ✓ ${resourceName}: Available`);
    } else {
      console.log(`  ✗ ${resourceName}: Not available`);
      allAvailable = false;
    }
  }

  console.log("\n" + "=".repeat(50));

  if (allAvailable) {
    console.log("\n✅ All Application Resources are available!");
    console.log("\n📝 Resources are accessible at:");
    requiredResources.forEach((name) => {
      console.log(`   - POST ${HARPERDB_URL}/${name}`);
    });
  } else {
    console.log("\n❌ Some Application Resources are not available");
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Make sure HarperDB container is running");
    console.log("   2. Check that application files are mounted:");
    console.log("      docker exec pylomarket-harperdb ls -la /opt/harperdb/applications/pylomarket");
    console.log("   3. Install dependencies (if package.json exists):");
    console.log("      docker exec pylomarket-harperdb sh -c 'cd /opt/harperdb/applications/pylomarket && npm install'");
    console.log("   4. Restart HarperDB container:");
    console.log("      docker restart pylomarket-harperdb");
    console.log("   5. Check HarperDB logs for errors:");
    console.log("      docker logs pylomarket-harperdb");
    console.log("\n   Note: HarperDB 4.7 automatically detects applications in /opt/harperdb/applications/{app_name}/");
    process.exit(1);
  }
}

verify();
