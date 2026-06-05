/**
 * Direct PostgreSQL Client
 * 
 * Used when DB_MODE=postgres for direct database connections
 * without Supabase dependency.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'
import { getPostgresConfig } from './config'


let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const config = getPostgresConfig()
    pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err)
    })
  }
  return pool
}
// import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {

// export async function query<T = Record<string, unknown>>(
  
//   text: string,
//   params?: unknown[]
// ): Promise<QueryResult<T>> {
  const pool = getPool()
  const start = Date.now()
  const result = await pool.query<T>(text, params)
  const duration = Date.now() - start
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PostgreSQL] Query executed in ${duration}ms, rows: ${result.rowCount}`)
  }
  
  return result
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool()
  return pool.connect()
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Close the pool (for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
