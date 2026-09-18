// Boots the whole product against a database that does not exist yet.
//
// An end-to-end test has to drive a real browser against a real server, and
// the obvious way to do that — point it at the dev servers already running —
// is the one thing this project must never do: that server talks to Atlas,
// which holds real student accounts and real listings. A verification script
// once deleted a real event that way.
//
// So this starts its own copy of everything, on its own ports:
//
//   mongod (in memory)  ->  server.js  ->  vite dev server  ->  Chrome
//
// The API child process is handed a MONGO_URI pointing at the throwaway
// mongod and nothing else. It cannot reach Atlas, because it is never told
// where Atlas is.

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '..', '..');
const SERVER = path.resolve(CLIENT, '..', 'server');

// mongodb-memory-server and mongoose are the server's dependencies, not the
// client's — required from where they actually live rather than installed
// twice.
const requireServer = createRequire(path.join(SERVER, 'package.json'));
const requireClient = createRequire(path.join(CLIENT, 'package.json'));

const { MongoMemoryServer } = requireServer('mongodb-memory-server');
const mongoose = requireServer('mongoose');
const bcrypt = requireServer('bcryptjs');
const puppeteer = requireClient('puppeteer-core');

// Ports of their own, so a dev server left running on 5000/5173 is neither
// disturbed nor accidentally tested.
export const API_PORT = 5055;
export const WEB_PORT = 5199;
export const API = `http://localhost:${API_PORT}`;
export const WEB = `http://localhost:${WEB_PORT}`;

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

// Same reason as the server suite's: mongod refuses to start indexing when
// the drive holding its data has under 500MB free, and on this machine the
// system temp directory does not.
const DB_ROOT = process.env.TEST_DB_PATH || path.join(SERVER, '.test-db');

const state = { mongod: null, api: null, web: null, browser: null, dbPath: null };

const waitFor = async (probe, what, timeoutMs = 60000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await probe()) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for ${what}`);
};

const startMongo = async () => {
  state.dbPath = path.join(DB_ROOT, 'e2e-' + crypto.randomBytes(5).toString('hex'));
  fs.mkdirSync(state.dbPath, { recursive: true });
  state.mongod = await MongoMemoryServer.create({ instance: { dbPath: state.dbPath } });
  const uri = state.mongod.getUri('collegeolx-e2e');
  await mongoose.connect(uri);
  return uri;
};

const startApi = async (mongoUri) => {
  state.api = spawn(process.execPath, ['server.js'], {
    cwd: SERVER,
    env: {
      ...process.env,
      NODE_ENV: 'test', // rate limiters off, logs quiet, no job queues
      PORT: String(API_PORT),
      MONGO_URI: mongoUri,
      JWT_ACCESS_SECRET: 'e2e-access-secret-not-used-anywhere-real',
      JWT_REFRESH_SECRET: 'e2e-refresh-secret-not-used-anywhere-real',
      CLIENT_URL: WEB,
      ADMIN_URL: `http://localhost:${WEB_PORT + 1}`,
      COLLEGE_EMAIL_DOMAINS: 'pec.edu.in',
      // A closed port, so a send fails instantly instead of hanging on
      // nodemailer's two-minute connect timeout. No mail leaves the machine.
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1',
      NODEMAILER_USER: 'e2e@example.com',
      NODEMAILER_PASS: 'not-a-real-password',
      REDIS_URL: 'redis://127.0.0.1:6399',
      CLOUDINARY_CLOUD_NAME: 'test',
      CLOUDINARY_API_KEY: 'test',
      CLOUDINARY_API_SECRET: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const log = [];
  state.api.stdout.on('data', (d) => log.push(String(d)));
  state.api.stderr.on('data', (d) => log.push(String(d)));
  state.api.on('exit', (code) => {
    if (code) console.error('API exited:', code, log.join(''));
  });

  await waitFor(async () => (await fetch(`${API}/api/v1/health`)).ok, 'the API');
};

const startWeb = async () => {
  // --mode e2e picks up client/.env.e2e, which points the app at the API
  // above. The developer's own .env is left alone.
  state.web = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', '--mode', 'e2e', '--port', String(WEB_PORT), '--strictPort'],
    { cwd: CLIENT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' }
  );
  state.web.stdout.on('data', () => {});
  state.web.stderr.on('data', (d) => console.error('[vite]', String(d).trim()));

  await waitFor(async () => (await fetch(WEB)).ok, 'the dev server');
};

export const startStack = async () => {
  const uri = await startMongo();
  await startApi(uri);
  await startWeb();

  const executablePath = CHROME_CANDIDATES.find((p) => p && fs.existsSync(p));
  if (!executablePath) throw new Error('No Chrome or Edge found');
  state.browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox'],
  });
};

export const stopStack = async () => {
  await state.browser?.close();
  for (const child of [state.web, state.api]) {
    if (!child) continue;
    // The vite process spawns its own child on Windows; killing the tree is
    // what actually frees the port.
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
  await mongoose.disconnect();
  await state.mongod?.stop();
  if (state.dbPath) fs.rmSync(state.dbPath, { recursive: true, force: true });
};

// --- what a test drives -----------------------------------------------------

// A signed-out visitor is expected to 401 here: useSessionRestore asks who
// is signed in, the interceptor tries a refresh, and both say "nobody". That
// is how the app learns it has no session, not a fault.
const isSessionProbe = (url) =>
  url.endsWith('/api/v1/users/me') || url.endsWith('/api/v1/auth/refresh-token');

// One tab with its own cookie jar. Two of these are two different people.
export const openTab = async ({ collectErrors = true } = {}) => {
  const context = await state.browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  // Two separate lists. `errors` is what the app's own code threw or logged.
  // `failures` is every API call that came back 4xx/5xx. Chrome also writes
  // each failed request to the console as "Failed to load resource", which
  // would double-count them and says nothing about which URL it was, so those
  // lines are dropped from `errors` and the response itself is recorded.
  const errors = [];
  const failures = [];
  if (collectErrors) {
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
        errors.push(m.text());
      }
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('response', (r) => {
      if (r.status() < 400 || !r.url().startsWith(API)) return;
      if (r.status() === 401 && isSessionProbe(r.url())) return;
      failures.push(`${r.status()} ${r.request().method()} ${r.url().slice(API.length)}`);
    });
  }

  page.errors = errors;
  page.failures = failures;
  page.go = async (route) => {
    await page.goto(WEB + route, { waitUntil: 'networkidle2' });
    // Routes are lazy chunks now; the fallback is the only thing that sets
    // aria-busy, so waiting for it to clear waits for the real page.
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 20000 });
  };
  page.text = () => page.evaluate(() => document.body.textContent || '');
  page.has = (needle) => page.text().then((t) => t.includes(needle));
  page.close_ = async () => context.close();

  return page;
};

export const db = () => mongoose.connection.db;

let seq = 0;
export const uniq = () => `${Date.now().toString(36)}${(seq += 1)}`;

export const PASSWORD = 'E2e-Passw0rd-1';

// Straight into the throwaway database: most tests are about a screen, not
// about registration, and going through the form every time would make each
// one depend on the one before it.
export const makeUser = async (overrides = {}) => {
  const tag = uniq();
  const doc = {
    name: `Test ${tag}`,
    email: `${tag}@example.com`,
    collegeEmail: `e2e${tag}@pec.edu.in`,
    phone: '9999900000',
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    role: 'student',
    isEmailVerified: true,
    isBlocked: false,
    trustScore: 50,
    dealsCompleted: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  const { insertedId } = await db().collection('users').insertOne(doc);
  return { _id: insertedId, ...doc };
};

export const makeListing = async (sellerId, overrides = {}) => {
  const doc = {
    title: `Test listing ${uniq()}`,
    description: 'Something a student is getting rid of at the end of term.',
    price: 500,
    category: 'books',
    condition: 'used',
    status: 'active',
    listingType: 'sale',
    securityDeposit: 0,
    images: [],
    sellerId,
    viewCount: 0,
    isBumped: false,
    scamScore: 0,
    expiresAt: new Date(Date.now() + 30 * 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  const { insertedId } = await db().collection('listings').insertOne(doc);
  return { _id: insertedId, ...doc };
};

// Signs in through the real form, so the tab ends up holding exactly the
// cookies a browser would.
export const signIn = async (page, user, password = PASSWORD) => {
  await page.go('/login');
  await page.type('input[name="collegeEmail"]', user.collegeEmail);
  await page.type('input[name="password"]', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 25000 }),
  ]);
  await page.waitForFunction(() => document.querySelector('[aria-label="Your account"]'), {
    timeout: 25000,
  });
};

export const clearDb = async () => {
  const collections = await db().listCollections().toArray();
  await Promise.all(collections.map((c) => db().collection(c.name).deleteMany({})));
};
