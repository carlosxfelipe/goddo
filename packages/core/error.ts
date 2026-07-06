export class GoddoError extends Error {
  code = 'UNKNOWN'
  status = 500

  constructor(message: string) {
    super(message)
    this.name = 'GoddoError'
  }
}

export class NotFoundError extends GoddoError {
  override code = 'NOT_FOUND'
  override status = 404

  constructor(message = 'NOT_FOUND') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ParseError extends GoddoError {
  override code = 'PARSE'
  override status = 400

  constructor(message = 'PARSE') {
    super(message)
    this.name = 'ParseError'
  }
}

export class ValidationError extends GoddoError {
  override code = 'VALIDATION'
  override status = 422

  constructor(message = 'VALIDATION') {
    super(message)
    this.name = 'ValidationError'
  }
}

export class InternalServerError extends GoddoError {
  override code = 'INTERNAL_SERVER_ERROR'
  override status = 500

  constructor(message = 'INTERNAL_SERVER_ERROR') {
    super(message)
    this.name = 'InternalServerError'
  }
}

export const error = (status: number, message?: string): GoddoError => {
  const err = new GoddoError(message ?? String(status))
  err.status = status
  return err
}
