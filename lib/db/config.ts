/**
 * Database Configuration
 * 
 * Supports two modes:
 * 1. Supabase (default) - Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 2. Direct PostgreSQL - Uses PG_* environment variables
 * 
 * Set DB_MODE=postgres to switch to direct PostgreSQL connection
 */

export type DatabaseMode = 'supabase' | 'postgres'

export function getDatabaseMode(): DatabaseMode {
  const mode = process.env.DB_MODE?.toLowerCase()
  if (mode === 'postgres' || mode === 'postgresql') {
    return 'postgres'
  }
  return 'supabase'
}

export interface PostgresConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
}

export function getPostgresConfig(): PostgresConfig {
  return {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DATABASE || 'claimsguard',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    ssl: process.env.PG_SSL === 'true',
  }
}

// Environment variable template for .env.local
export const ENV_TEMPLATE = `
# Database Mode: 'supabase' (default) or 'postgres'
# DB_MODE=supabase

# ─── Supabase Configuration (default) ─────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ─── Direct PostgreSQL Configuration ──────────────────────────────────────────
# Uncomment and set these if using DB_MODE=postgres
# PG_HOST=localhost
# PG_PORT=5432
# PG_DATABASE=claimsguard
# PG_USER=postgres
# PG_PASSWORD=your_password
# PG_SSL=false

# ─── ML Service Configuration ─────────────────────────────────────────────────
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_ENABLED=true
`
