import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg"

// PostgreSQL connection using standard environment variables
// These are read by pgAdmin and psql natively
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "claims_guard",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// Log connection info (without password)
pool.on("connect", () => {
  console.log(`[PostgreSQL] Connected to ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`)
})

pool.on("error", (err) => {
  console.error("[PostgreSQL] Unexpected error on idle client", err)
})

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Query helper with automatic connection handling
export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now()
  const result = await pool.query<T>(text, params)
  const duration = Date.now() - start
  console.log(`[PostgreSQL] Query executed in ${duration}ms - rows: ${result.rowCount}`)
  return result
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

// Health check
export async function checkConnection(): Promise<boolean> {
  try {
    await query("SELECT 1")
    return true
  } catch {
    return false
  }
}

// Close pool (for graceful shutdown)
export async function closePool(): Promise<void> {
  await pool.end()
}

export { pool }
