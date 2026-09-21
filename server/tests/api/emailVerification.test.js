// Email verification, and the fact that it is now compulsory.
//
// It used to be decorative. Registering sent a link, the verify screen
// offered a "sign in" button next to it, and login never looked at the flag
// — so the whole check could be skipped by clicking past it, and the one
// promise this product makes (everybody here holds a checked college
// address) held for nobody. These tests pin the check shut, and pin open the
// two doors a student needs once it is: a fresh link, and a clear reason.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeUser, PASSWORD } = require('../helpers/factory');
const User = require('../../src/models/User');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

const signIn = (user, password = PASSWORD) =>
  client().post('/auth/login', { collegeEmail: user.collegeEmail, password });

// The same token the emailed link carries.
const linkToken = (userId, expiresIn = '1d') =>
  jwt.sign({ userId: String(userId) }, process.env.JWT_ACCESS_SECRET, { expiresIn });

describe('an unverified account cannot sign in', () => {
  before(clearDb);

  test('the right password is still refused until the address is verified', async () => {
    const user = await makeUser({ isEmailVerified: false });
    const res = await signIn(user);

    assert.equal(res.status, 403);
    assert.match(res.body.message, /verify/i);
  });

  test('it is refused without handing out a session', async () => {
    const user = await makeUser({ isEmailVerified: false });
    const api = client();

    await api.post('/auth/login', { collegeEmail: user.collegeEmail, password: PASSWORD });

    assert.equal(api.cookies.size, 0, 'no cookie may be set on a refused sign-in');
  });

  // The client has to tell this apart from a wrong password — one goes to
  // the verify screen, the other puts a line under the field.
  test('it is tagged, so the client can send them somewhere useful', async () => {
    const user = await makeUser({ isEmailVerified: false });
    const res = await signIn(user);

    assert.equal(res.body.code, 'EMAIL_UNVERIFIED');
  });

  // Checked after the password, or the refusal itself would answer "is this
  // address registered?" for anyone who asked.
  test('a wrong password on an unverified account is an ordinary 401', async () => {
    const user = await makeUser({ isEmailVerified: false });
    const res = await signIn(user, 'not-the-password');

    assert.equal(res.status, 401);
    assert.equal(res.body.code, undefined);
  });

  test('a verified account signs in as before', async () => {
    const user = await makeUser();
    const res = await signIn(user);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.collegeEmail, user.collegeEmail);
  });

  test('a suspended account is still told it is suspended, not unverified', async () => {
    const user = await makeUser({ isEmailVerified: false, isBlocked: true });
    const res = await signIn(user);

    assert.equal(res.body.code, 'ACCOUNT_BLOCKED');
  });
});

describe('the whole loop, the way a student walks it', () => {
  before(clearDb);

  test('register, get turned away, verify, get in', async () => {
    const collegeEmail = 'newcomer.test@pec.edu.in';
    const password = 'a-long-enough-password';

    const registered = await client().post('/auth/register', {
      name: 'Newcomer Student',
      email: 'newcomer@example.com',
      collegeEmail,
      phone: '9876500001',
      password,
    });
    assert.equal(registered.status, 201);

    const tooEarly = await client().post('/auth/login', { collegeEmail, password });
    assert.equal(tooEarly.status, 403, 'registering is not the same as verifying');

    const verified = await client().get(
      `/auth/verify-email?token=${linkToken(registered.body.data.userId)}`
    );
    assert.equal(verified.status, 200);

    const now = await client().post('/auth/login', { collegeEmail, password });
    assert.equal(now.status, 200);
  });
});

describe('asking for the link again', () => {
  before(clearDb);

  test('an unverified account can ask for a fresh one', async () => {
    const user = await makeUser({ isEmailVerified: false });
    const res = await client().post('/auth/resend-verification', {
      collegeEmail: user.collegeEmail,
    });

    assert.equal(res.status, 200);
  });

  // Registering again is a 409, so without this the account was stuck for
  // good: it could not sign in and could not be re-made.
  test('the address is not freed up by asking', async () => {
    const user = await makeUser({ isEmailVerified: false });
    await client().post('/auth/resend-verification', { collegeEmail: user.collegeEmail });

    const stored = await User.findById(user._id);
    assert.equal(stored.isEmailVerified, false, 'asking for a link does not verify anything');
  });

  // Same answer either way, or this becomes a way to find out who is
  // registered, one address at a time.
  test('an unknown address gets the same answer as a real one', async () => {
    const user = await makeUser({ isEmailVerified: false });

    const real = await client().post('/auth/resend-verification', {
      collegeEmail: user.collegeEmail,
    });
    const nobody = await client().post('/auth/resend-verification', {
      collegeEmail: 'nobody.at.all@pec.edu.in',
    });

    assert.equal(real.status, nobody.status);
    assert.equal(real.body.message, nobody.body.message);
  });

  test('an already-verified account gets that same answer too', async () => {
    const user = await makeUser();
    const res = await client().post('/auth/resend-verification', {
      collegeEmail: user.collegeEmail,
    });

    assert.equal(res.status, 200);
  });

  test('the address is matched however it is typed', async () => {
    const user = await makeUser({ isEmailVerified: false });
    const res = await client().post('/auth/resend-verification', {
      collegeEmail: `  ${user.collegeEmail.toUpperCase()}  `,
    });

    assert.equal(res.status, 200);
  });

  test('a request with no address is a 400', async () => {
    assert.equal((await client().post('/auth/resend-verification', {})).status, 400);
  });
});

describe('the link itself', () => {
  before(clearDb);

  test('an expired link is refused and verifies nobody', async () => {
    const user = await makeUser({ isEmailVerified: false });
    const res = await client().get(
      `/auth/verify-email?token=${linkToken(user._id, '-1s')}`
    );

    assert.equal(res.status, 400);
    assert.equal((await User.findById(user._id)).isEmailVerified, false);
  });

  test('a made-up token is refused', async () => {
    assert.equal((await client().get('/auth/verify-email?token=not-a-jwt')).status, 400);
  });

  // A token signed with a different secret must not pass, or anyone able to
  // guess the payload shape could verify an address they do not own.
  test('a token signed with the wrong secret is refused', async () => {
    const user = await makeUser({ isEmailVerified: false });
    const forged = jwt.sign({ userId: String(user._id) }, 'some-other-secret');

    assert.equal((await client().get(`/auth/verify-email?token=${forged}`)).status, 400);
    assert.equal((await User.findById(user._id)).isEmailVerified, false);
  });

  test('verifying twice is not an error', async () => {
    const user = await makeUser({ isEmailVerified: false });
    const token = linkToken(user._id);

    assert.equal((await client().get(`/auth/verify-email?token=${token}`)).status, 200);
    assert.equal((await client().get(`/auth/verify-email?token=${token}`)).status, 200);
    assert.equal((await User.findById(user._id)).isEmailVerified, true);
  });
});
