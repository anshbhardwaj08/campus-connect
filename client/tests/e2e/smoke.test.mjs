import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { startStack, stopStack, openTab, makeUser, makeListing, signIn } from './harness.mjs';

before(startStack, { timeout: 180000 });
after(stopStack);

test('the stack comes up and the front page renders', async () => {
  const page = await openTab();
  await page.go('/');

  assert.ok(await page.has('COLLEGE'), 'the masthead should be on the page');
  assert.equal(page.errors.length, 0, page.errors.join(' | '));
  assert.equal(page.failures.length, 0, page.failures.join(' | '));
  await page.close_();
});

test('a seeded listing reaches the browse page', async () => {
  const seller = await makeUser({ name: 'Smoke Seller' });
  await makeListing(seller._id, { title: 'A smoke test bicycle' });

  const page = await openTab();
  await page.go('/browse');

  assert.ok(await page.has('A smoke test bicycle'));
  await page.close_();
});

test('signing in through the form lands a real session', async () => {
  const user = await makeUser({ name: 'Smoke Buyer' });

  const page = await openTab();
  await signIn(page, user);

  assert.ok(await page.$('[aria-label="Your account"]'));
  await page.close_();
});
