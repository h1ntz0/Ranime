import pg from 'pg'

export function createPool(connectionString: string): pg.Pool {
  const isCloud =
    connectionString.includes('sslmode=') ||
    connectionString.includes('supabase') ||
    connectionString.includes('neon.tech') ||
    process.env.NODE_ENV === 'production'

  // Clean sslmode query params to allow pg.Pool's custom ssl object to take precedence
  const cleanUrl = connectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')

  return new pg.Pool({
    connectionString: cleanUrl,
    max: 10,
    ...(isCloud ? { ssl: { rejectUnauthorized: false } } : {}),
  })
}


