// The admin sidebar: a fixed rail on a desk-sized screen, a drawer behind a
// menu button on a phone. Before this the rail was 248px at every width and
// took most of a phone screen.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { startStack, stopStack, openTab, makeUser, waitForDialog, tap, ADMIN, PASSWORD } from './harness.mjs';

before(() => startStack({ admin: true }), { timeout: 240000 });
after(stopStack);

const signInAdmin = async (page, user) => {
  await page.go(`${ADMIN}/login`);
  await page.type('input[type="email"]', user.collegeEmail);
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 25000 }),
    page.click('button[type="submit"]'),
  ]);
  // The URL changes before the protected shell has rendered. Wait for the
  // shell itself: the rail on a wide screen, the menu button on a narrow one.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('aside a[href="/users"], button[aria-label="Open menu"]')].some((el) =>
        el.checkVisibility({ visibilityProperty: true })
      ),
    { timeout: 25000 }
  );
};

// Set SHOTS=<dir> to keep screenshots of the phone layout for a human look.
const shot = (page, name) =>
  process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) : null;

const isShown = (page, selector) =>
  page.evaluate(
    (sel) => Boolean(document.querySelector(sel)?.checkVisibility({ visibilityProperty: true })),
    selector
  );

const drawerOpen = (page) => page.evaluate(() => Boolean(document.querySelector('[aria-label="Navigation"]')));

test('desktop: the rail is there and there is no menu button', async () => {
  const mod = await makeUser({ name: 'Desk Moderator', role: 'moderator' });
  const page = await openTab();
  await signInAdmin(page, mod);

  assert.ok(await isShown(page, 'aside a[href="/users"]'), 'the rail should be on screen');
  assert.equal(await isShown(page, 'button[aria-label="Open menu"]'), false);

  assert.equal(page.errors.length, 0, page.errors.join(' | '));
  assert.equal(page.failures.length, 0, page.failures.join(' | '));
  await page.close_();
});

test('phone: the rail collapses into a drawer', async (t) => {
  const mod = await makeUser({ name: 'Phone Moderator', role: 'moderator' });
  const page = await openTab();
  await page.setViewport({ width: 390, height: 844 });
  await signInAdmin(page, mod);

  const openMenu = async () => {
    await tap(page, 'button[aria-label="Open menu"]');
    await waitForDialog(page);
  };

  await t.test('the rail is hidden and the page fits the screen', async () => {
    assert.equal(await isShown(page, 'aside a[href="/users"]'), false);
    assert.ok(await isShown(page, 'button[aria-label="Open menu"]'));
    await shot(page, 'admin-phone-closed');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, `the page scrolls sideways by ${overflow}px`);
  });

  await t.test('picking a page goes there and closes the drawer', async () => {
    await openMenu();
    await shot(page, 'admin-phone-open');
    await Promise.all([
      page.waitForFunction(() => location.pathname === '/users', { timeout: 15000 }),
      page.click('[aria-label="Navigation"] a[href="/users"]'),
    ]);
    await page.waitForFunction(() => !document.querySelector('[aria-label="Navigation"]'));
  });

  await t.test('Escape closes it', async () => {
    await openMenu();
    await page.keyboard.press('Escape');
    assert.equal(await drawerOpen(page), false);
  });

  await t.test('tapping outside closes it', async () => {
    await openMenu();
    await page.mouse.click(370, 500); // right of the 248px sheet, on the scrim
    assert.equal(await drawerOpen(page), false);
  });

  await t.test('the close button closes it', async () => {
    await openMenu();
    await page.click('button[aria-label="Close menu"]');
    assert.equal(await drawerOpen(page), false);
  });

  await t.test('nothing went wrong along the way', () => {
    assert.equal(page.errors.length, 0, page.errors.join(' | '));
    assert.equal(page.failures.length, 0, page.failures.join(' | '));
  });

  await page.close_();
});
