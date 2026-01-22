/**
 * Bootstrap script to create HarperDB schema and tables
 * Run this script to initialize the database schema
 */

const HARPERDB_URL = process.env.HARPERDB_URL || "http://localhost:9925";
const HARPERDB_USERNAME = process.env.HARPERDB_USERNAME || "HDB_ADMIN";
const HARPERDB_PASSWORD = process.env.HARPERDB_PASSWORD || "password";

const tables = {
  users: {
    hash_attribute: "id",
    attributes: {
      id: "string",
      email: "string",
      password_hash: "string",
      username: "string",
      created_at: "datetime",
      updated_at: "datetime",
    },
  },
  wallets: {
    hash_attribute: "id",
    attributes: {
      id: "string",
      user_id: "string",
      solana_address: "string",
      created_at: "datetime",
      updated_at: "datetime",
    },
  },
  balances: {
    hash_attribute: "id",
    attributes: {
      id: "string",
      user_id: "string",
      balance: "number",
      currency: "string",
      updated_at: "datetime",
    },
  },
  markets: {
    hash_attribute: "id",
    attributes: {
      id: "string",
      title: "string",
      description: "string",
      category: "string",
      end_date: "datetime",
      resolved: "boolean",
      resolution: "string",
      created_at: "datetime",
      updated_at: "datetime",
    },
  },
  orders: {
    hash_attribute: "id",
    attributes: {
      id: "string",
      market_id: "string",
      user_id: "string",
      side: "string",
      outcome: "string",
      price: "number",
      quantity: "number",
      filled_quantity: "number",
      status: "string",
      created_at: "datetime",
      updated_at: "datetime",
    },
  },
  trades: {
    hash_attribute: "id",
    attributes: {
      id: "string",
      market_id: "string",
      buy_order_id: "string",
      sell_order_id: "string",
      buyer_id: "string",
      seller_id: "string",
      outcome: "string",
      price: "number",
      quantity: "number",
      created_at: "datetime",
    },
  },
  transactions: {
    hash_attribute: "id",
    attributes: {
      id: "string",
      user_id: "string",
      type: "string",
      amount: "number",
      currency: "string",
      status: "string",
      solana_signature: "string",
      metadata: "string",
      created_at: "datetime",
    },
  },
};

async function createSchema() {
  const auth = Buffer.from(`${HARPERDB_USERNAME}:${HARPERDB_PASSWORD}`).toString("base64");

  try {
    // Create schema
    const schemaResponse = await fetch(`${HARPERDB_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        operation: "create_schema",
        schema: "pylomarket",
      }),
    });

    if (schemaResponse.ok) {
      console.log("✓ Schema 'pylomarket' created or already exists");
    } else {
      const error = await schemaResponse.text();
      if (error.includes("already exists")) {
        console.log("✓ Schema 'pylomarket' already exists");
      } else {
        console.error("Error creating schema:", error);
      }
    }

    // Create tables
    for (const [tableName, tableDef] of Object.entries(tables)) {
      const tableResponse = await fetch(`${HARPERDB_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          operation: "create_table",
          schema: "pylomarket",
          table: tableName,
          hash_attribute: tableDef.hash_attribute,
        }),
      });

      if (tableResponse.ok) {
        console.log(`✓ Table '${tableName}' created or already exists`);
      } else {
        const error = await tableResponse.text();
        if (error.includes("already exists")) {
          console.log(`✓ Table '${tableName}' already exists`);
        } else {
          console.error(`Error creating table '${tableName}':`, error);
        }
      }
    }

    console.log("\n✓ Bootstrap completed successfully!");
  } catch (error) {
    console.error("Bootstrap error:", error);
    process.exit(1);
  }
}

createSchema();
