// Validates that a string is a well-formed email on an allowed college domain.
//
// The server enforces this for real (middleware/collegeEmail.js reads
// COLLEGE_EMAIL_DOMAINS). This client copy exists so the auth screens can
// print the domain error inline, under the field, before a round trip.
// Keep VITE_COLLEGE_EMAIL_DOMAINS in sync with the server's list.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const COLLEGE_DOMAINS = (import.meta.env.VITE_COLLEGE_EMAIL_DOMAINS || 'pec.edu.in')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

// The placeholder shown on every college-email field.
export const EMAIL_PLACEHOLDER = `rollnumber@${COLLEGE_DOMAINS[0] || 'yourcollege.ac.in'}`;

// Printed under the field, in crimson. Plain and unsoftened.
export const DOMAIN_ERROR = 'That domain is not on the register. Try your college address.';

export const validateCollegeEmail = (email, allowedDomains = COLLEGE_DOMAINS) => {
  if (!EMAIL_REGEX.test(email)) return false;

  const domain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.map((d) => d.toLowerCase()).includes(domain);
};

export default validateCollegeEmail;
