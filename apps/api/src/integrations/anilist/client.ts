export class AniListError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly graphqlErrors?: unknown[],
  ) {
    super(message)
    this.name = 'AniListError'
  }
}

export interface AniListClientOptions {
  endpoint: string
  timeoutMs?: number
  maxRetries?: number
  /** Injectable fetch for testing. */
  fetchFn?: typeof fetch
}

interface GraphQLResponse<T> {
  data?: T
  errors?: { message: string }[]
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class AniListClient {
  private fetchFn: typeof fetch

  constructor(private options: AniListClientOptions) {
    this.fetchFn = options.fetchFn ?? fetch
  }

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const timeoutMs = this.options.timeoutMs ?? 15_000
    const maxRetries = this.options.maxRetries ?? 2

    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.requestOnce<T>(query, variables, timeoutMs)
      } catch (error) {
        lastError = error
        const retriable =
          (error instanceof AniListError &&
            error.statusCode !== undefined &&
            RETRYABLE_STATUS.has(error.statusCode)) ||
          (error instanceof TypeError && error.message.includes('fetch'))
        if (!retriable || attempt === maxRetries) {
          throw error
        }
        const backoff = 300 * 2 ** attempt + Math.floor(Math.random() * 200)
        await sleep(backoff)
      }
    }
    throw lastError
  }

  private async requestOnce<T>(
    query: string,
    variables: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let res: Response
    try {
      res = await this.fetchFn(this.options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })
    } catch (error) {
      throw new AniListError(`AniList request failed: ${(error as Error).message}`, 0)
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      throw new AniListError(`AniList responded with status ${res.status}`, res.status)
    }

    const body = (await res.json()) as GraphQLResponse<T>
    if (body.errors && body.errors.length > 0) {
      throw new AniListError(
        `AniList GraphQL error: ${body.errors[0]?.message ?? 'unknown'}`,
        res.status,
        body.errors,
      )
    }
    if (body.data === undefined) {
      throw new AniListError('AniList returned an empty response')
    }
    return body.data
  }
}