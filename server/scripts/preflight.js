// Pre-deploy check: what would be unsafe if this shipped right now.
//
//   npm run preflight
//
// Exits non-zero on any FAIL, so it can gate a deploy rather than being a
// list somebody remembers to read. WARNs are things to look at; FAILs are
// things that would be a real problem in front of real students.
//
// Nothing here prints a secret. Checks are on shape and strength — length,
// entropy, whether a value is still a placeholder — never on the value
// itself, because the whole point is that this can be run and pasted
// anywhere without leaking the thing it is guarding.

require('dotenv').config();
const dns = require('dns');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Mirrors src/config/db.js — Atlas SRV lookups fail on some networks
// without this, and a preflight that cannot reach the database is useless.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const results = [];
const record = (level, area, message, fix) => results.push({ level, area, message, fix });
const pass = (area, message) => record('PASS', area, message);
const warn = (area, message, fix) => record('WARN', area, message, fix);
const fail = (area, message, fix) => record('FAIL', area, message, fix);

const REQUIRED_ENV = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
  'ADMIN_URL',
  'COLLEGE_EMAIL_DOMAINS',
];

// Passwords that exist in this repo's history, its docs, or any list an
// attacker would try in the first second.
const KNOWN_PASSWORDS = [
  'Passw0rd123',
  'password',
  'password123',
  'admin',
  'admin123',
  'changeme',
  'letmein',
  '12345678',
  'secret',
];

const PLACEHOLDER_SECRETS = [
  'secret',
  'changeme',
  'your-secret-here',
  'jwt-secret',
  'supersecret',
  'test',
];

const isProd = process.env.NODE_ENV === 'production';

// --- Config ---------------------------------------------------------------

const checkEnv = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    fail('config', `Missing env vars: ${missing.join(', ')}`, 'Set them in server/.env');
  } else {
    pass('config', `All ${REQUIRED_ENV.length} required env vars are set`);
  }

  if (!isProd) {
    warn(
      'config',
      `NODE_ENV is "${process.env.NODE_ENV || 'unset'}", not "production"`,
      'Cookies are only sent with Secure when NODE_ENV=production — set it on the deployed server'
    );
  } else {
    pass('config', 'NODE_ENV is production, so auth cookies get the Secure flag');
  }

  [
    ['CLIENT_URL', process.env.CLIENT_URL],
    ['ADMIN_URL', process.env.ADMIN_URL],
  ].forEach(([key, value]) => {
    if (!value) return;
    const local = /localhost|127\.0\.0\.1/.test(value);
    if (isProd && local) {
      fail(key, `Points at ${value}`, 'CORS and email links will break — set the deployed URL');
    } else if (isProd && !value.startsWith('https://')) {
      fail(key, 'Is not https', 'SameSite/Secure cookies need https in production');
    } else if (local) {
      warn(key, `Points at ${value} (fine for local work)`, 'Change before deploying');
    } else {
      pass(key, value);
    }
  });

  if (process.env.MONGO_URI && /localhost|127\.0\.0\.1/.test(process.env.MONGO_URI) && isProd) {
    fail('MONGO_URI', 'Points at a local database in production', 'Use the Atlas connection string');
  }
};

// --- Secrets --------------------------------------------------------------

// Not cryptographic entropy — just enough to catch "mysecretkey" and
// "aaaaaaaa", which is what actually gets shipped by accident.
const looksWeak = (value) => {
  const unique = new Set(value).size;
  return value.length < 32 || unique < 12;
};

const checkSecrets = () => {
  const access = process.env.JWT_ACCESS_SECRET || '';
  const refresh = process.env.JWT_REFRESH_SECRET || '';

  [
    ['JWT_ACCESS_SECRET', access],
    ['JWT_REFRESH_SECRET', refresh],
  ].forEach(([key, value]) => {
    if (!value) return;
    if (PLACEHOLDER_SECRETS.some((p) => value.toLowerCase().includes(p))) {
      fail(key, 'Still looks like a placeholder', 'Replace with 32+ random bytes');
    } else if (looksWeak(value)) {
      fail(
        key,
        `Weak — ${value.length} chars, ${new Set(value).size} distinct`,
        "Generate one: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""
      );
    } else {
      pass(key, `${value.length} chars, looks random`);
    }
  });

  if (access && refresh && access === refresh) {
    fail(
      'secrets',
      'Access and refresh tokens are signed with the SAME secret',
      'A stolen access token could then be replayed as a refresh token — use two different secrets'
    );
  } else if (access && refresh) {
    pass('secrets', 'Access and refresh secrets are different');
  }
};

// --- Accounts -------------------------------------------------------------

const checkAccounts = async () => {
  const User = require('../src/models/User');

  const privileged = await User.find({ role: { $in: ['admin', 'moderator'] } })
    .select('+passwordHash name collegeEmail role')
    .lean();

  if (!privileged.length) {
    warn('accounts', 'No admin or moderator account exists', 'Nobody can sign in to /admin');
  } else {
    pass('accounts', `${privileged.length} privileged account(s): ${privileged.map((u) => `${u.collegeEmail} (${u.role})`).join(', ')}`);
  }

  // Every account, not just the privileged ones. The seeded students here
  // are named like real people — priyasharma.bt24cse@… — so any filter on
  // "demo" in the address misses exactly the accounts that were created in
  // bulk with one shared password. Signing in as one of those is enough to
  // message students under a name they trust.
  //
  // Cost is O(accounts × guesses) bcrypt comparisons, which is deliberately
  // slow. Fine before a deploy at campus scale; needs rethinking if this
  // ever has thousands of users.
  const everyone = await User.find({})
    .select('+passwordHash name collegeEmail role')
    .lean();

  let weak = 0;
  for (const user of everyone) {
    if (!user.passwordHash) continue;
    for (const guess of KNOWN_PASSWORDS) {
      // eslint-disable-next-line no-await-in-loop
      if (await bcrypt.compare(guess, user.passwordHash)) {
        weak += 1;
        fail(
          'accounts',
          `${user.collegeEmail} (${user.role}) uses a well-known password`,
          'npm run rotate-password -- ' + user.collegeEmail
        );
        break;
      }
    }
  }

  if (!weak) pass('accounts', `Checked all ${everyone.length} account(s) for known passwords — none found`);

  // Leftovers from testing. Not deleted automatically: an account owns
  // listings, deals and chats, and removing one takes the other side's copy
  // of a conversation with it.
  const junk = everyone.filter(
    (u) =>
      /\.(invalid|test|example|local)$/i.test(u.collegeEmail) ||
      /^(test|tmp|temp|dummy|fake)[^@]*@/i.test(u.collegeEmail)
  );
  if (junk.length) {
    warn(
      'accounts',
      `${junk.length} account(s) look like test leftovers: ${junk.map((u) => u.collegeEmail).join(', ')}`,
      'Check what they own before deleting — DELETE /admin/users/:id removes their listings, deals and chats too'
    );
  }

  const unverified = await User.countDocuments({ isEmailVerified: false });
  if (unverified) {
    warn('accounts', `${unverified} account(s) never verified their college email`, 'Expected during development; worth a look before launch');
  }
};

// --- Run ------------------------------------------------------------------

const ICON = { PASS: ' ok ', WARN: 'warn', FAIL: 'FAIL' };

const main = async () => {
  checkEnv();
  checkSecrets();

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    await checkAccounts();
    await mongoose.disconnect();
  } catch (err) {
    fail('database', `Could not connect: ${err.message}`, 'Account checks were skipped');
  }

  console.log('\nPre-deploy check\n');
  results.forEach((r) => {
    console.log(`[${ICON[r.level]}] ${r.area}: ${r.message}`);
    if (r.fix && r.level !== 'PASS') console.log(`         → ${r.fix}`);
  });

  const fails = results.filter((r) => r.level === 'FAIL').length;
  const warns = results.filter((r) => r.level === 'WARN').length;

  console.log(
    `\n${results.length - fails - warns} passed, ${warns} to look at, ${fails} to fix.`
  );
  if (fails) console.log('Not safe to deploy yet.');

  process.exit(fails ? 1 : 0);
};

main();
