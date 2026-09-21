// Signing up, the whole way, through the real screens.
//
// This flow had a hole in the middle of it. The form worked, the account was
// created and the verify screen appeared — and then the verify screen's own
// button took you to the sign-in form, which let you in whether or not you
// had ever opened the email. The one page standing between a stranger and
// the product could be skipped in one click, and there was no way to ask for
// another link if the first never arrived.
//
// So this test is mostly about being refused, and about getting unstuck.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

import {
  startStack,
  stopStack,
  openTab,
  press,
  waitForText,
  db,
  uniq,
  ACCESS_SECRET,
  PASSWORD,
} from './harness.mjs';

const jwt = createRequire(path.resolve('..', 'server', 'package.json'))('jsonwebtoken');

before(startStack, { timeout: 180000 });
after(stopStack);

const fill = async (tab, name, value) => tab.type(`input[name="${name}"]`, value);

test('a stranger cannot get in until the college address is verified', async (t) => {
  const tab = await openTab();
  const collegeEmail = `newcomer${uniq()}@pec.edu.in`;

  await t.test('the form takes the details and asks for the inbox', async () => {
    await tab.go('/register');
    await fill(tab, 'name', 'Newcomer Student');
    await fill(tab, 'collegeEmail', collegeEmail);
    await fill(tab, 'phone', '9876543210');
    await fill(tab, 'password', PASSWORD);
    await fill(tab, 'confirmPassword', PASSWORD);

    await Promise.all([
      tab.waitForFunction(() => location.pathname === '/verify-email', { timeout: 20000 }),
      tab.click('button[type="submit"]'),
    ]);
    await waitForText(tab, 'One link away');

    const user = await db().collection('users').findOne({ collegeEmail });
    assert.ok(user, 'the account exists');
    assert.equal(user.isEmailVerified, false, 'registering is not verifying');
  });

  await t.test('the right password is not enough on its own', async () => {
    await tab.go('/login');
    await fill(tab, 'collegeEmail', collegeEmail);
    await fill(tab, 'password', PASSWORD);

    await Promise.all([
      tab.waitForFunction(() => location.pathname === '/verify-email', { timeout: 20000 }),
      tab.click('button[type="submit"]'),
    ]);

    // Sent back to the screen that can help, not left on the form with a
    // line of red under the password.
    assert.equal(
      await tab.evaluate(() => !!document.querySelector('[aria-label="Your account"]')),
      false,
      'nobody may be signed in'
    );
    assert.equal(
      await tab.evaluate(() => document.querySelector('input[name="collegeEmail"]')?.value),
      collegeEmail,
      'the address carries over so the link can be re-sent without retyping it'
    );
  });

  await t.test('a fresh link can be asked for', async () => {
    await press(tab, 'Send it again');
    await waitForText(tab, 'Sent');

    const user = await db().collection('users').findOne({ collegeEmail });
    assert.equal(user.isEmailVerified, false, 'asking for a link verifies nothing by itself');
  });

  await t.test('opening the link is what does it', async () => {
    const user = await db().collection('users').findOne({ collegeEmail });
    const token = jwt.sign({ userId: String(user._id) }, ACCESS_SECRET, { expiresIn: '1d' });

    await tab.go(`/verify-email?token=${token}`);
    await waitForText(tab, 'Email verified');

    assert.equal((await db().collection('users').findOne({ collegeEmail })).isEmailVerified, true);
  });

  await t.test('and then the page opens', async () => {
    await tab.go('/login');
    await fill(tab, 'collegeEmail', collegeEmail);
    await fill(tab, 'password', PASSWORD);
    await Promise.all([
      tab.click('button[type="submit"]'),
      tab.waitForFunction(() => location.pathname === '/', { timeout: 25000 }),
    ]);
    await tab.waitForFunction(() => document.querySelector('[aria-label="Your account"]'), {
      timeout: 25000,
    });
  });

  await t.test('a spent link says so and offers another', async () => {
    const stale = jwt.sign({ userId: 'nobody' }, ACCESS_SECRET, { expiresIn: '-1s' });
    const fresh = await openTab();

    await fresh.go(`/verify-email?token=${stale}`);
    await waitForText(fresh, 'Link rejected');
    // The old copy sent them to /register, which answers 409 for an address
    // that is already taken — a dead end dressed up as a way out.
    assert.equal(await fresh.has('Send it again'), true);

    assert.equal(fresh.errors.length, 0, fresh.errors.join(' | '));
    await fresh.close_();
  });

  await t.test('nothing went wrong along the way', () => {
    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);

    // The refused sign-in is the point of the test, so it is the one 4xx
    // allowed here. Anything else is a real fault.
    const unexpected = tab.failures.filter((f) => f !== '403 POST /api/v1/auth/login');
    assert.equal(unexpected.length, 0, `API: ${unexpected.join(' | ')}`);
    assert.equal(
      tab.failures.filter((f) => f === '403 POST /api/v1/auth/login').length,
      1,
      'the unverified sign-in should have been refused exactly once'
    );
  });

  await tab.close_();
});
