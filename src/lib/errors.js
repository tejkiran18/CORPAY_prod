class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL', details = null } = {}) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.code = code
    this.details = details
  }
}
class ValidationError extends AppError {
  constructor(details) { super('Validation failed', { status: 400, code: 'VALIDATION', details }) }
}
class NotFoundError extends AppError {
  constructor(entity = 'Resource') { super(`${entity} not found`, { status: 404, code: 'NOT_FOUND' }) }
}
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(message, { status: 403, code: 'FORBIDDEN' }) }
}
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(message, { status: 401, code: 'UNAUTHORIZED' }) }
}
class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(message, { status: 409, code: 'CONFLICT' }) }
}
class RateLimitError extends AppError {
  constructor() { super('Too many requests', { status: 429, code: 'RATE_LIMIT' }) }
}
module.exports = { AppError, ValidationError, NotFoundError, ForbiddenError, UnauthorizedError, ConflictError, RateLimitError }
