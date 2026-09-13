const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const messages = error.details.map((d) => d.message);
    throw new ApiError(400, 'Validation failed', messages);
  }
  req.body = value;
  next();
};

module.exports = validate;
