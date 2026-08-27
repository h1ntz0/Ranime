/**
 * Shared types between web and api.
 * Internal API contract:
 *   Success: { data, meta? }
 *   Error:   { error: { code, message } }
 */

export interface ApiSuccess<T> {
  data: T
  meta?: Record<string, unknown>
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse

export interface HealthResponse {
  status: 'ok' | 'degraded'
  service: string
  database: 'up' | 'down'
  uptime: number
  timestamp: string
}
