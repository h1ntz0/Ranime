import pg from 'pg'

let globalPool: pg.Pool | null = null

export function createPool(connectionString: string, opts: { reuse?: boolean } = {}): pg.Pool {
  const isCloud =
    connectionString.includes('sslmode=') ||
    connectionString.includes('supabase') ||
    connectionString.includes('neon.tech') ||
    process.env.NODE_ENV === 'production'

  // Clean sslmode query params to allow pg.Pool's custom ssl object to take precedence
  const cleanUrl = connectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')

  const shouldReuse = opts.reuse ?? process.env.NODE_ENV === 'production'

  if (shouldReuse && globalPool && !globalPool.ended) {
    return globalPool
  }

  const pool = new pg.Pool({
    connectionString: cleanUrl,
    max: isCloud ? 4 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: isCloud ? 15000 : 5000,
    keepAlive: true,
    ...(isCloud ? { ssl: { rejectUnauthorized: false } } : {}),
  })

  pool.on('error', (err) => {
    console.error('Unexpected idle pg client error:', err)
  })

  if (process.env.NODE_ENV !== 'test') {
    // Open the socket (TLS + auth to a cloud database runs into seconds) while the server is
    // still booting so the first request does not pay for it.
    pool.query('select 1').catch(() => {})
  }

  if (shouldReuse) {
    globalPool = pool
  }

  return pool
}



