/** Base class for all Goddo framework errors. */
export class GoddoError extends Error {
  /** The specific string-based error code. */
  code = 'UNKNOWN'
  /** The HTTP status code associated with this error. */
  status = 500

  /**
   * Creates a new GoddoError.
   * @param message The error message.
   */
  constructor(message: string) {
    super(message)
    this.name = 'GoddoError'
  }
}

/** Error thrown when a requested route or resource is not found. */
export class NotFoundError extends GoddoError {
  /** The specific string-based error code. */
  override code = 'NOT_FOUND'
  /** The HTTP status code associated with this error (404). */
  override status = 404

  /**
   * Creates a new NotFoundError.
   * @param message The error message.
   */
  constructor(message = 'NOT_FOUND') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/** Error thrown when incoming data fails to parse (e.g., malformed JSON). */
export class ParseError extends GoddoError {
  /** The specific string-based error code. */
  override code = 'PARSE'
  /** The HTTP status code associated with this error (400). */
  override status = 400

  /**
   * Creates a new ParseError.
   * @param message The error message.
   */
  constructor(message = 'PARSE') {
    super(message)
    this.name = 'ParseError'
  }
}

/** Error thrown when incoming data fails schema validation. */
export class ValidationError extends GoddoError {
  /** The specific string-based error code. */
  override code = 'VALIDATION'
  /** The HTTP status code associated with this error (422). */
  override status = 422

  /**
   * Creates a new ValidationError.
   * @param message The error message.
   */
  constructor(message = 'VALIDATION') {
    super(message)
    this.name = 'ValidationError'
  }
}

/** Error thrown when an unexpected server condition occurs. */
export class InternalServerError extends GoddoError {
  /** The specific string-based error code. */
  override code = 'INTERNAL_SERVER_ERROR'
  /** The HTTP status code associated with this error (500). */
  override status = 500

  /**
   * Creates a new InternalServerError.
   * @param message The error message.
   */
  constructor(message = 'INTERNAL_SERVER_ERROR') {
    super(message)
    this.name = 'InternalServerError'
  }
}

/**
 * Helper function to create a new GoddoError with a specific HTTP status.
 * @param status The HTTP status code.
 * @param message The error message.
 * @returns A new GoddoError instance.
 */
export const error = (status: number, message?: string): GoddoError => {
  const err = new GoddoError(message ?? String(status))
  err.status = status
  return err
}
