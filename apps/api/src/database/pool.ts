import pg from 'pg'

let globalPool: pg.Pool | null = null

export function createPool(connectionString: string): pg.Pool {
  const isCloud =
    connectionString.includes('sslmode=') ||
    connectionString.includes('supabase') ||
    connectionString.includes('neon.tech') ||
    process.env.NODE_ENV === 'production'

  // Clean sslmode query params to allow pg.Pool's custom ssl object to take precedence
  const cleanUrl = connectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')

  if (globalPool) {
    return globalPool
  }

  globalPool = new pg.Pool({
    connectionString: cleanUrl,
    max: isCloud ? 2 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    ...(isCloud ? { ssl: { rejectUnauthorized: false } } : {}),
  })

  return globalPool
}



