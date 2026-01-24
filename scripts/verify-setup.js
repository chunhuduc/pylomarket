/**
 * Setup Verification Script
 * Verifies HarperDB setup, schema, tables, and custom functions
 */

const HARPERDB_URL = process.env.HARPERDB_URL || "http://localhost:9925";
const HARPERDB_USERNAME = process.env.HARPERDB_USERNAME || "HDB_ADMIN";
const HARPERDB_PASSWORD = process.env.HARPERDB_PASSWORD || "password";
const SCHEMA = "pylomarket";

const auth = Buffer.from(`${HARPERDB_USERNAME}:${HARPERDB_PASSWORD}`).toString("base64");

const checks = {
  harperdbConnection: false,
  schemaExists: false,
  tablesExist: false,
  customFunctionsLoaded: false,
};

const errors = [];
const warnings = [];

/**
 * Check HarperDB connection
 */
async function checkHarperDBConnection() {
  try {
    const response = await fetch(`${HARPERDB_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ operation: "describe_all" }),
    });

    if (response.ok) {
      checks.harperdbConnection = true;
      console.log("✓ HarperDB connection: OK");
      return true;
    } else {
      errors.push(`HarperDB connection failed: HTTP ${response.status}`);
      console.log("✗ HarperDB connection: FAILED");
      return false;
    }
  } catch (error) {
    errors.push(`HarperDB connection error: ${error.message}`);
    console.log("✗ HarperDB connection: ERROR");
    return false;
  }
}

/**
 * Check if schema exists
 */
async function checkSchema() {
  try {
    const response = await fetch(`${HARPERDB_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ operation: "describe_all" }),
    });

    if (!response.ok) {
      errors.push("Cannot check schema: HarperDB connection failed");
      return false;
    }

    const data = await response.json();
    const schemas = Object.keys(data || {});

    if (schemas.includes(SCHEMA)) {
      checks.schemaExists = true;
      console.log(`✓ Schema '${SCHEMA}': EXISTS`);
      return true;
    } else {
      errors.push(`Schema '${SCHEMA}' not found. Available schemas: ${schemas.join(", ") || "none"}`);
      console.log(`✗ Schema '${SCHEMA}': NOT FOUND`);
      console.log(`  Run: node scripts/bootstrap.js`);
      return false;
    }
  } catch (error) {
    errors.push(`Schema check error: ${error.message}`);
    console.log(`✗ Schema '${SCHEMA}': ERROR`);
    return false;
  }
}

/**
 * Check if tables exist
 */
async function checkTables() {
  const requiredTables = ["users", "wallets", "balances", "markets", "orders", "trades", "transactions"];

  try {
    const response = await fetch(`${HARPERDB_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        operation: "describe_schema",
        schema: SCHEMA,
      }),
    });

    if (!response.ok) {
      errors.push("Cannot check tables: Schema check failed");
      return false;
    }

    const data = await response.json();
    const existingTables = Object.keys(data || {});

    const missingTables = requiredTables.filter((table) => !existingTables.includes(table));

    if (missingTables.length === 0) {
      checks.tablesExist = true;
      console.log(`✓ Tables: ALL EXIST (${requiredTables.length} tables)`);
      return true;
    } else {
      errors.push(`Missing tables: ${missingTables.join(", ")}`);
      console.log(`✗ Tables: MISSING (${missingTables.length} of ${requiredTables.length})`);
      console.log(`  Run: node scripts/bootstrap.js`);
      return false;
    }
  } catch (error) {
    errors.push(`Tables check error: ${error.message}`);
    console.log("✗ Tables: ERROR");
    return false;
  }
}

/**
 * Check if HarperDB 4.7 Application Resources are loaded
 */
async function checkApplicationResources() {
  const requiredResources = ["AuthResource", "WalletResource", "MarketResource", "OrderResource", "SolanaResource"];

  const resourceStatus = {};

  for (const resourceName of requiredResources) {
    try {
      const response = await fetch(`${HARPERDB_URL}/${resourceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "test" }),
      });

      // 404 means resource doesn't exist
      // 400/500 might mean it exists but test action is invalid (which is OK)
      resourceStatus[resourceName] = response.status !== 404;
    } catch (error) {
      resourceStatus[resourceName] = false;
    }
  }

  const missingResources = Object.entries(resourceStatus)
    .filter(([_, available]) => !available)
    .map(([name]) => name);

  if (missingResources.length === 0) {
    checks.customFunctionsLoaded = true; // Keep same check name for compatibility
    console.log(`✓ Application Resources: ALL LOADED (${requiredResources.length} resources)`);
    return true;
  } else {
    errors.push(`Application Resources not loaded: ${missingResources.join(", ")}`);
    console.log(`✗ Application Resources: MISSING (${missingResources.length} of ${requiredResources.length})`);
    console.log(`  Make sure schema.graphql, resources.js, and config.yaml are mounted in HarperDB container`);
    console.log(`  Check docker-compose.yml volumes configuration`);
    console.log(`  Application should be at: /opt/harperdb/applications/pylomarket`);
    return false;
  }
}

/**
 * Main verification function
 */
async function verify() {
  console.log("🔍 Verifying PyloMarket setup...\n");
  console.log(`📊 Schema: ${SCHEMA}`);
  console.log(`🔗 HarperDB URL: ${HARPERDB_URL}\n`);

  // Run checks in order
  const connectionOk = await checkHarperDBConnection();
  if (!connectionOk) {
    console.log("\n❌ Setup verification FAILED");
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Make sure HarperDB container is running:");
    console.log("      docker-compose up harperdb -d");
    console.log("   2. Check if HarperDB is accessible:");
    console.log(`      curl ${HARPERDB_URL}`);
    process.exit(1);
  }

  await checkSchema();
  await checkTables();
  await checkApplicationResources();

  console.log("\n" + "=".repeat(50));

  // Summary
  const allChecksPassed =
    checks.harperdbConnection &&
    checks.schemaExists &&
    checks.tablesExist &&
    checks.customFunctionsLoaded;

  if (allChecksPassed) {
    console.log("\n✅ Setup verification PASSED");
    console.log("\n🎉 Your PyloMarket setup is ready!");
    console.log("\n📝 Next steps:");
    console.log("   1. Start Next.js app: cd app && npm run dev");
    console.log("   2. Access app: http://localhost:3000");
    console.log("   3. Check health: http://localhost:3000/api/health");
  } else {
    console.log("\n❌ Setup verification FAILED");
    console.log("\n📋 Issues found:");
    errors.forEach((error) => console.log(`   - ${error}`));
    if (warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      warnings.forEach((warning) => console.log(`   - ${warning}`));
    }
    console.log("\n💡 Fix the issues above and run this script again.");
    process.exit(1);
  }
}

// Run verification
verify();
