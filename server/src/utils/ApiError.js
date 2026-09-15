class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.data = null;
    this.code = null;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // A machine-readable tag for the cases a client has to branch on, so it
  // does not have to match against the human message — which is free to be
  // reworded at any time. Only attach one where the client genuinely needs
  // to tell two errors of the same status apart: a 403 for "you are
  // blocked" has to land somewhere very different from a 403 for "that is
  // a moderator's page".
  // `details` carries the small amount of structured data that goes with
  // such a case — the reason for a suspension, say — so a client does not
  // have to parse it back out of the sentence.
  withCode(code, details = null) {
    this.code = code;
    this.details = details;
    return this;
  }
}

module.exports = ApiError;
