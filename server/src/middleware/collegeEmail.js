const ApiError = require('../utils/ApiError');

const validateCollegeEmail = (req, res, next) => {
  const { collegeEmail } = req.body;
  if (!collegeEmail) throw new ApiError(400, 'College email is required');

  const allowedDomains = (process.env.COLLEGE_EMAIL_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const domain = collegeEmail.split('@')[1]?.toLowerCase();
  if (!domain || !allowedDomains.includes(domain)) {
    throw new ApiError(400, 'Please use a valid college email address');
  }

  next();
};

module.exports = validateCollegeEmail;
