// The deployed shape, run locally: server.js in production mode, serving the
// BUILT student app at / and the built admin panel at /admin, on one origin.
// No vite anywhere. Run with `npm run test:prod`, which builds both first.
//
// Each test below is something that only goes wrong once deployed, so the
// dev-server suite (tests/e2e) cannot see it:
//   - the login cookie has to survive a real page load and a hard refresh
//   - refreshing a deep link has to get the app, not a 404
//   - the admin panel has to find its assets and routes under /admin
//   - the security headers must not block the fonts, photos or socket
//   - behind a proxy, the rate limiter must tell students apart
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  startStack,
  stopStack,
  openTab,
  makeUser,
  signIn,
  waitForText,
  API,
  PASSWORD,
} from '../e2e/harness.mjs';

before(() => startStack({ production: true }), { timeout: 180000 });
after(stopStack);

test('the student app is served by the API server itself, with no errors', async () => {
  const page = await openTab();
  await page.go('/');

  assert.ok(await page.has('COLLEGE'), 'the masthead should render');
  // A Content-Security-Policy violation (a blocked font, script or socket)
  // lands in the console as an error, so this also checks the headers.
  assert.equal(page.errors.length, 0, page.errors.join(' | '));
  assert.equal(page.failures.length, 0, page.failures.join(' | '));
  await page.close_();
});

test('a signed-in student survives a hard refresh on a deep link', async () => {
  const user = await makeUser({ name: 'Prod Student' });
  const page = await openTab();

  const socketUp = new Promise((resolve) => {
    page.on('response', (r) => {
      if (r.url().startsWith(`${API}/socket.io/`) && r.status() === 200) resolve(true);
    });
    setTimeout(() => resolve(false), 20000);
  });

  await signIn(page, user);

  const cookies = await page.browserContext().cookies();
  const access = cookies.find((c) => c.name === 'accessToken');
  assert.ok(access, 'the login should set the access cookie');
  assert.equal(access.httpOnly, true);
  assert.equal(access.secure, true, 'production cookies must be Secure');

  // Straight to the URL, as a refresh or a bookmark would: the server has
  // to hand back the app, and the app has to find the session again.
  await page.go('/deals');
  await waitForText(page, 'YOUR DEALS');
  assert.ok(await page.$('[aria-label="Your account"]'), 'still signed in after the refresh');

  assert.equal(await socketUp, true, 'the live socket should connect on the same origin');
  assert.equal(page.errors.length, 0, page.errors.join(' | '));
  assert.equal(page.failures.length, 0, page.failures.join(' | '));
  await page.close_();
});

test('the admin panel works under /admin, including a deep-link refresh', async () => {
  const mod = await makeUser({ name: 'Prod Moderator', role: 'moderator' });
  const page = await openTab();

  await page.go('/admin/login');
  await page.type('input[type="email"]', mod.collegeEmail);
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([
    // The router lands on /admin (its basename plus '/'), no trailing slash.
    page.waitForFunction(() => /^\/admin\/?$/.test(location.pathname), { timeout: 25000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => document.querySelector('aside a[href="/admin/users"]'), { timeout: 25000 });

  await page.go('/admin/users');
  await waitForText(page, 'accounts registered');

  assert.equal(page.errors.length, 0, page.errors.join(' | '));
  assert.equal(page.failures.length, 0, page.failures.join(' | '));
  await page.close_();
});

test('/admin without the slash lands on the panel, and unknown API routes stay JSON', async () => {
  // express.static answers the bare directory with its own redirect.
  const bare = await fetch(`${API}/admin`, { redirect: 'manual' });
  assert.ok([301, 302].includes(bare.status), `got ${bare.status}`);
  assert.equal(bare.headers.get('location'), '/admin/');

  const followed = await fetch(`${API}/admin`);
  assert.equal(followed.status, 200);
  assert.match(await followed.text(), /\/admin\/assets\//, 'the panel, with its assets under /admin');

  const missing = await fetch(`${API}/api/v1/no-such-route`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /json/);
});

test('behind a proxy, one student hitting the login limit does not lock out another', async () => {
  // Render's proxy puts the real address in X-Forwarded-For. With
  // `trust proxy` the limiter keys on it; without it, every student would
  // share the proxy's address and one person's mistakes would lock the
  // login for the whole school.
  const attempt = (ip) =>
    fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ collegeEmail: 'nobody@pec.edu.in', password: 'wrong-password-1' }),
    }).then((r) => r.status);

  let status;
  for (let i = 0; i < 25; i += 1) status = await attempt('203.0.113.7');
  assert.equal(status, 429, 'the student guessing passwords should be limited');

  assert.notEqual(await attempt('203.0.113.8'), 429, 'a different student must not be locked out');
});
