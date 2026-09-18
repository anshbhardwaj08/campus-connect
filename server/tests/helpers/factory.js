// Fixtures. Everything a test needs made by the test itself, so no
// assertion ever depends on what happens to be in the database.

require('./env');

const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const Listing = require('../../src/models/Listing');
const Conversation = require('../../src/models/Conversation');
const { client } = require('./api');

// Cost 4 rather than the app's 10: a suite creates dozens of accounts and
// bcrypt is deliberately slow. The cost is read back out of the hash, so
// login compares exactly as it would in production.
const PASSWORD = 'Test-Passw0rd-1';
const hash = (password = PASSWORD) => bcrypt.hash(password, 4);

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter += 1)}`;

const makeUser = async (overrides = {}) => {
  const tag = uniq();
  return User.create({
    name: `Test ${tag}`,
    // example.com is reserved by RFC 2606 — it can never reach a real
    // mailbox, and unlike .invalid it passes Joi's TLD check, so the same
    // addresses work whether a test writes through the model or the API.
    email: `${tag}@example.com`,
    collegeEmail: `test${tag}@pec.edu.in`,
    phone: '9999900000',
    passwordHash: await hash(overrides.password),
    isEmailVerified: true,
    ...(({ password, ...rest }) => rest)(overrides),
  });
};

// Signs in over the real login endpoint, so the returned client carries the
// same cookies a browser would.
const signIn = async (user, password = PASSWORD) => {
  const c = client();
  const res = await c.post('/auth/login', { collegeEmail: user.collegeEmail, password });
  if (res.status !== 200) {
    throw new Error(`Could not sign in ${user.collegeEmail}: ${res.status} ${res.body?.message}`);
  }
  return c;
};

const makeSignedInUser = async (overrides = {}) => {
  const user = await makeUser(overrides);
  return { user, api: await signIn(user, overrides.password) };
};

const makeListing = async (sellerId, overrides = {}) =>
  Listing.create({
    title: `Test listing ${uniq()}`,
    description: 'Something a student is getting rid of at the end of term.',
    price: 500,
    category: 'books',
    condition: 'used',
    status: 'active',
    sellerId,
    ...overrides,
  });

const makeRental = async (sellerId, overrides = {}) =>
  makeListing(sellerId, {
    listingType: 'rent',
    rentPeriod: 'day',
    price: 120,
    securityDeposit: 1500,
    ...overrides,
  });

const makeConversation = async (listing, buyerId) =>
  Conversation.create({
    participants: [buyerId, listing.sellerId],
    listingId: listing._id,
  });

module.exports = {
  PASSWORD,
  makeUser,
  signIn,
  makeSignedInUser,
  makeListing,
  makeRental,
  makeConversation,
};
