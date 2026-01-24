/**
 * HarperDB client utility
 * Handles communication with HarperDB REST API
 */

// For server-side use only
import { HARPERDB_URL } from "./harperdb-connection";
const HARPERDB_USERNAME = process.env.HARPERDB_USERNAME || "HDB_ADMIN";
const HARPERDB_PASSWORD = process.env.HARPERDB_PASSWORD || "password";

const SCHEMA = "pylomarket";

function getAuthHeader(): string {
  const auth = Buffer.from(`${HARPERDB_USERNAME}:${HARPERDB_PASSWORD}`).toString("base64");
  return `Basic ${auth}`;
}

export interface HarperDBResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

export async function harperDBRequest<T = any>(
  operation: string,
  body: Record<string, any>
): Promise<HarperDBResponse<T>> {
  try {
    const response = await fetch(`${HARPERDB_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        operation,
        schema: SCHEMA,
        ...body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.message || "HarperDB request failed",
        data: data,
      };
    }

    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper functions for common operations
export async function insert<T extends Record<string, any>>(
  table: string,
  records: T[]
): Promise<HarperDBResponse<T[]>> {
  return harperDBRequest<T[]>("insert", {
    table,
    records,
  });
}

export async function searchByHash<T = any>(
  table: string,
  hashValues: string[],
  attributes?: string[]
): Promise<HarperDBResponse<T[]>> {
  return harperDBRequest<T[]>("search_by_hash", {
    table,
    hash_values: hashValues,
    get_attributes: attributes,
  });
}

export async function searchByValue<T = any>(
  table: string,
  searchAttribute: string,
  searchValue: any,
  attributes?: string[]
): Promise<HarperDBResponse<T[]>> {
  return harperDBRequest<T[]>("search_by_value", {
    table,
    search_attribute: searchAttribute,
    search_value: searchValue,
    get_attributes: attributes,
  });
}

export async function update<T extends Record<string, any>>(
  table: string,
  records: T[]
): Promise<HarperDBResponse<T[]>> {
  return harperDBRequest<T[]>("update", {
    table,
    records,
  });
}

export async function deleteRecords(
  table: string,
  hashValues: string[]
): Promise<HarperDBResponse> {
  return harperDBRequest("delete", {
    table,
    hash_values: hashValues,
  });
}

export async function sql<T = any>(query: string): Promise<HarperDBResponse<T[]>> {
  return harperDBRequest<T[]>("sql", {
    sql: query,
  });
}
