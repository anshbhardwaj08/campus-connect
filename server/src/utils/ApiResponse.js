class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', pagination = null) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.data = data;
    this.message = message;
    if (pagination) this.pagination = pagination;
  }
}

module.exports = ApiResponse;
