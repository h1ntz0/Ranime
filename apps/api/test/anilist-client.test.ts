import { describe, expect, it, vi } from 'vitest'
import { AniListClient, AniListError } from '../src/integrations/anilist/client.js'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('AniListClient', () => {
  it('returns data on a successful query', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(200, { data: { ok: true } }))
    const client = new AniListClient({ endpoint: 'https://graphql.anilist.co', fetchFn })

    const result = await client.query<{ ok: boolean }>('query { x }')

    expect(result).toEqual({ ok: true })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ query: 'query { x }', variables: {} })
  })

  it('retries on 5xx and succeeds', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }))
    const client = new AniListClient({ endpoint: 'https://graphql.anilist.co', fetchFn })

    const result = await client.query<{ ok: boolean }>('query { x }')

    expect(result).toEqual({ ok: true })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('gives up after max retries', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(500, {}))
    const client = new AniListClient({ endpoint: 'https://graphql.anilist.co', fetchFn })

    await expect(client.query('query { x }')).rejects.toThrow(/status 500/)
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('surfaces GraphQL errors', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { errors: [{ message: 'Not Found.' }] }))
    const client = new AniListClient({ endpoint: 'https://graphql.anilist.co', fetchFn })

    const err = await client.query('query { x }').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AniListError)
    expect((err as AniListError).message).toContain('Not Found.')
  })

  it('aborts after the timeout', async () => {
    const fetchFn = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    )
    const client = new AniListClient({
      endpoint: 'https://graphql.anilist.co',
      fetchFn,
      timeoutMs: 20,
    })

    await expect(client.query('query { x }')).rejects.toThrow(/request failed/i)
  })
})