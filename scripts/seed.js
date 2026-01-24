/**
 * Seed script for HarperDB
 * Populates initial data using HarperDB REST API insert operation
 * Supports idempotent runs (can be executed multiple times safely)
 */

const fs = require("fs");
const path = require("path");

const HARPERDB_URL = process.env.HARPERDB_URL || "http://localhost:9925";
const HARPERDB_USERNAME = process.env.HARPERDB_USERNAME || "HDB_ADMIN";
const HARPERDB_PASSWORD = process.env.HARPERDB_PASSWORD || "password";
const SCHEMA = "pylomarket";

// Load seed data
const seedDataPath = path.join(__dirname, "..", "seed", "data.json");
const seedData = JSON.parse(fs.readFileSync(seedDataPath, "utf8"));

// Table insertion order (respecting dependencies)
const tableOrder = [
  "users",      // No dependencies
  "wallets",    // Depends on users
  "balances",   // Depends on users
  "markets",    // No dependencies
  "orders",     // Depends on users and markets
  "trades",     // Depends on orders
  "transactions", // Depends on users
];

/**
 * Check if record exists in table
 */
async function recordExists(table, hashValue) {
  const auth = Buffer.from(`${HARPERDB_USERNAME}:${HARPERDB_PASSWORD}`).toString("base64");

  try {
    const response = await fetch(`${HARPERDB_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        operation: "search_by_hash",
        schema: SCHEMA,
        table: table,
        hash_values: [hashValue],
        get_attributes: ["id"],
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Insert records into a table
 * Skips records that already exist (idempotent)
 */
async function insertRecords(table, records) {
  const auth = Buffer.from(`${HARPERDB_USERNAME}:${HARPERDB_PASSWORD}`).toString("base64");

  if (!records || records.length === 0) {
    console.log(`  ⏭️  Skipping ${table} (no records)`);
    return { inserted: 0, skipped: 0 };
  }

  // Filter out existing records (idempotent)
  const newRecords = [];
  let skipped = 0;

  for (const record of records) {
    const hashAttribute = getHashAttribute(table);
    const hashValue = record[hashAttribute];

    if (await recordExists(table, hashValue)) {
      skipped++;
    } else {
      newRecords.push(record);
    }
  }

  if (newRecords.length === 0) {
    console.log(`  ✓ ${table}: All ${records.length} records already exist (skipped)`);
    return { inserted: 0, skipped: records.length };
  }

  try {
    const response = await fetch(`${HARPERDB_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        operation: "insert",
        schema: SCHEMA,
        table: table,
        records: newRecords,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const inserted = Array.isArray(result) ? result.length : newRecords.length;

    if (skipped > 0) {
      console.log(`  ✓ ${table}: Inserted ${inserted} new records, skipped ${skipped} existing`);
    } else {
      console.log(`  ✓ ${table}: Inserted ${inserted} records`);
    }

    return { inserted, skipped };
  } catch (error) {
    console.error(`  ✗ ${table}: Error inserting records:`, error.message);
    throw error;
  }
}

/**
 * Get hash attribute for a table
 */
function getHashAttribute(table) {
  // All tables use "id" as hash attribute
  return "id";
}

/**
 * Main seed function
 */
async function seed() {
  console.log("🌱 Starting HarperDB seed...\n");
  console.log(`📊 Schema: ${SCHEMA}`);
  console.log(`🔗 URL: ${HARPERDB_URL}\n`);

  let totalInserted = 0;
  let totalSkipped = 0;

  try {
    // Insert records in dependency order
    for (const table of tableOrder) {
      if (!seedData[table]) {
        console.log(`  ⚠️  ${table}: No seed data found`);
        continue;
      }

      const result = await insertRecords(table, seedData[table]);
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
    }

    console.log("\n✅ Seed completed successfully!");
    console.log(`📈 Summary: ${totalInserted} records inserted, ${totalSkipped} records skipped`);
  } catch (error) {
    console.error("\n❌ Seed failed:", error.message);
    process.exit(1);
  }
}

// Run seed
seed();
