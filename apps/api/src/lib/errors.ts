export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(message: string): AppError {
  return new AppError(404, 'NOT_FOUND', message)
}

export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message)
}

export function forbidden(message = 'You are not allowed to perform this action'): AppError {
  return new AppError(403, 'FORBIDDEN', message)
}

export function validation(message: string): AppError {
  return new AppError(422, 'VALIDATION_ERROR', message)
}

export function conflict(message: string): AppError {
  return new AppError(409, 'CONFLICT', message)
}