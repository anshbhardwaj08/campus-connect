// Validates that a string is a well-formed email on an allowed college domain
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateCollegeEmail = (email, allowedDomains = ['college.edu']) => {
  if (!EMAIL_REGEX.test(email)) return false;

  const domain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.map((d) => d.toLowerCase()).includes(domain);
};

export default validateCollegeEmail;
