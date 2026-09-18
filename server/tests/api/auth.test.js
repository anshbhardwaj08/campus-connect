require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeUser, signIn, PASSWORD } = require('../helpers/factory');
const User = require('../../src/models/User');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const registration = (overrides = {}) => ({
  name: 'Registered Student',
  // RFC 2606 reserved: never deliverable, and it passes Joi's TLD check
  // (".invalid" does not).
  email: 'registered@example.com',
  collegeEmail: 'registered.test@pec.edu.in',
  phone: '9876500000',
  password: 'a-long-enough-password',
  ...overrides,
});

describe('registration', () => {
  before(clearDb);

  test('refuses an address outside the college domains', async () => {
    const res = await client().post('/auth/register', registration({ collegeEmail: 'someone@gmail.com' }));

    assert.equal(res.status, 400);
    assert.equal(await User.countDocuments({ collegeEmail: 'someone@gmail.com' }), 0);
  });

  test('creates the account without signing anyone in', async () => {
    const api = client();
    const res = await api.post('/auth/register', registration());

    assert.equal(res.status, 201);
    // Registering must not hand out a session: the email is unverified, and
    // the response carries an id and nothing else.
    assert.equal(api.cookies.size, 0);

    const created = await User.findOne({ collegeEmail: 'registered.test@pec.edu.in' });
    assert.equal(res.body.data.userId, String(created._id));
  });

  test('refuses a second account on the same college email', async () => {
    const res = await client().post('/auth/register', registration());

    assert.equal(res.status, 409);
    assert.equal(await User.countDocuments({ collegeEmail: 'registered.test@pec.edu.in' }), 1);
  });

  test('refuses a password under the eight-character floor', async () => {
    const res = await client().post('/auth/register', registration({
      collegeEmail: 'shortpw.test@pec.edu.in',
      password: 'short',
    }));

    assert.equal(res.status, 400);
  });
});

describe('signing in', () => {
  let user;
  before(async () => {
    await clearDb();
    user = await makeUser();
  });

  test('sets both cookies and returns the user without secrets', async () => {
    const api = client();
    const res = await api.post('/auth/login', { collegeEmail: user.collegeEmail, password: PASSWORD });

    assert.equal(res.status, 200);
    assert.ok(api.cookies.has('accessToken'));
    assert.ok(api.cookies.has('refreshToken'));
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.equal(res.body.data.user.refreshToken, undefined);
  });

  test('is not case sensitive about the address', async () => {
    const res = await client().post('/auth/login', {
      collegeEmail: user.collegeEmail.toUpperCase(),
      password: PASSWORD,
    });

    assert.equal(res.status, 200);
  });

  test('rejects a wrong password as an untagged 401', async () => {
    const res = await client().post('/auth/login', {
      collegeEmail: user.collegeEmail,
      password: 'not-the-password',
    });

    assert.equal(res.status, 401);
    // Only ACCOUNT_BLOCKED carries a code. Tagging this one would send the
    // client to the suspended screen over a typo.
    assert.equal(res.body.code ?? null, null);
  });

  test('gives the same status for an account that does not exist', async () => {
    const res = await client().post('/auth/login', {
      collegeEmail: 'nobody.at.all@pec.edu.in',
      password: PASSWORD,
    });

    assert.equal(res.status, 401);
  });
});

describe('the session', () => {
  let user;
  let api;
  before(async () => {
    await clearDb();
    user = await makeUser();
    api = await signIn(user);
  });

  test('GET /users/me returns the signed-in student', async () => {
    const res = await api.get('/users/me');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.collegeEmail, user.collegeEmail);
  });

  test('GET /users/me is 401 without a cookie', async () => {
    const res = await client().get('/users/me');

    assert.equal(res.status, 401);
  });

  // Regression test for route order in user.routes.js. Declared after the
  // "/:id" routes, this path matches "/:id/listings" with id === "me" and
  // the handler dies casting "me" to an ObjectId — a 500, not a 404, so it
  // would not read as a missing route.
  test('GET /users/me/listings is not matched as /users/:id/listings', async () => {
    const res = await api.get('/users/me/listings');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.listings));
  });

  test('refresh-token issues a fresh access cookie', async () => {
    const res = await api.post('/auth/refresh-token');

    assert.equal(res.status, 200);
    // Checked by what the response set, not by comparing token strings:
    // jwt.sign is deterministic per second, so a token reissued inside the
    // same second as the last one is byte-identical to it.
    assert.ok(res.setCookies.some((c) => c.startsWith('accessToken=') && !c.startsWith('accessToken=;')));
    assert.equal((await api.get('/users/me')).status, 200);
  });

  test('logout clears the cookies and the session stops working', async () => {
    const res = await api.post('/auth/logout');

    assert.equal(res.status, 200);
    assert.equal(api.cookies.has('accessToken'), false);
    assert.equal((await api.get('/users/me')).status, 401);
  });
});

describe('forgotten password', () => {
  let user;
  before(async () => {
    await clearDb();
    user = await makeUser();
  });

  test('answers identically for an address it knows and one it does not', async () => {
    const known = await client().post('/auth/forgot-password', { collegeEmail: user.collegeEmail });
    const unknown = await client().post('/auth/forgot-password', { collegeEmail: 'ghost@pec.edu.in' });

    // Any visible difference turns this into a way to find out who is
    // registered, one address at a time.
    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.equal(known.body.message, unknown.body.message);
  });

  test('stores only a hash of the token, expiring inside the hour', async () => {
    await client().post('/auth/forgot-password', { collegeEmail: user.collegeEmail });

    const stored = await User.findById(user._id).select('+passwordResetToken +passwordResetExpires');
    assert.match(stored.passwordResetToken, /^[a-f0-9]{64}$/);

    const minutesLeft = (stored.passwordResetExpires - Date.now()) / 60000;
    assert.ok(minutesLeft > 55 && minutesLeft <= 60, `expiry was ${minutesLeft} minutes away`);
  });

  test('refuses a token that was never issued', async () => {
    const res = await client().post('/auth/reset-password', {
      token: 'f'.repeat(64),
      password: 'a-brand-new-password',
    });

    assert.equal(res.status, 400);
  });

  test('refuses an expired token', async () => {
    const raw = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { _id: user._id },
      { passwordResetToken: sha256(raw), passwordResetExpires: new Date(Date.now() - 1000) }
    );

    const res = await client().post('/auth/reset-password', { token: raw, password: 'a-brand-new-password' });

    assert.equal(res.status, 400);
  });

  test('a reset changes the password, burns the link and ends other sessions', async () => {
    // Another device, signed in with the old password before the reset.
    const otherDevice = await signIn(user);
    assert.equal((await otherDevice.post('/auth/refresh-token')).status, 200);

    const raw = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { _id: user._id },
      { passwordResetToken: sha256(raw), passwordResetExpires: new Date(Date.now() + 60000) }
    );

    const reset = await client().post('/auth/reset-password', { token: raw, password: 'a-brand-new-password' });
    assert.equal(reset.status, 200);

    // Checked before anything signs in again, and deliberately so: a later
    // login mints a refresh token from the same userId, and two JWTs signed
    // in the same second are the same string — which would hand the old
    // device a token that happens to match.
    assert.equal((await otherDevice.post('/auth/refresh-token')).status, 401);
    const after = await User.findById(user._id).select('+refreshToken +passwordResetToken');
    assert.equal(after.refreshToken, null);
    assert.equal(after.passwordResetToken, undefined);

    const withOld = await client().post('/auth/login', { collegeEmail: user.collegeEmail, password: PASSWORD });
    assert.equal(withOld.status, 401);

    const withNew = await client().post('/auth/login', {
      collegeEmail: user.collegeEmail,
      password: 'a-brand-new-password',
    });
    assert.equal(withNew.status, 200);

    // Single use.
    const reuse = await client().post('/auth/reset-password', { token: raw, password: 'another-password' });
    assert.equal(reuse.status, 400);
  });
});
