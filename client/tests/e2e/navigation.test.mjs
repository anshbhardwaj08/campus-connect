// Every page a signed-in student is meant to use has to be reachable by
// clicking, on a desktop screen and on a phone.
//
// This exists because Your deals had no link on desktop: the only one lived
// in the mobile drawer, which is hidden at desktop widths. Every other test
// opened /deals by URL, so nothing noticed. Here nothing is opened by URL
// except the starting page — each destination has to be found as a visible
// link, on the page or behind one of the two menus, and clicked.
//
// It does not care WHICH menu a link lives in, only that one exists. Moving
// a link is fine; losing it at one screen size is what fails.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { startStack, stopStack, openTab, makeUser, signIn } from './harness.mjs';

before(startStack, { timeout: 180000 });
after(stopStack);

// Sell is left out on purpose: on desktop it is a button, not a link, and it
// sits in the masthead at every width (the bottom bar's Sell tab on phones).
const DESTINATIONS = [
  '/browse',
  '/looking-for',
  '/events',
  '/lost-found',
  '/carpool',
  '/chat',
  '/profile',
  '/profile?tab=listings',
  '/profile?tab=notifications',
  '/deals',
  '/saved',
  '/settings',
];

const SCREENS = {
  desktop: { width: 1400, height: 950 },
  phone: { width: 390, height: 844 },
};

// The two places a link can hide behind. Opened in turn only if the page
// itself has no visible link to the destination.
const MENUS = ['button[aria-label="Your account"]', 'button[aria-label="Open menu"]'];

// A link counts only if a tap on its centre would land on it: visible, and
// not covered by anything. "Visible" alone is not enough — the drawer opens
// with a wipe, and until it finishes the lower items are clipped, so a tap
// there hits the masthead behind them.
const clickableLink = (href) => {
  const a = [...document.querySelectorAll('a')].find(
    (el) => el.getAttribute('href') === href && el.checkVisibility({ visibilityProperty: true })
  );
  if (!a) return null;
  const r = a.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return hit && a.contains(hit) ? a : null;
};

const findLink = async (page, href) => {
  const onPage = await page.evaluateHandle(clickableLink, href);
  if (onPage.asElement()) return onPage.asElement();

  for (const menu of MENUS) {
    const opener = await page.$(menu);
    if (!opener || !(await opener.isVisible())) continue;
    await opener.click();
    // Give the menu's opening motion time to finish before giving up on it.
    const inMenu = await page
      .waitForFunction(clickableLink, { timeout: 3000 }, href)
      .catch(() => null);
    if (inMenu?.asElement()) return inMenu.asElement();
    await opener.click(); // close it again before trying the next one
  }
  return null;
};

for (const [screen, viewport] of Object.entries(SCREENS)) {
  test(`every student page is reachable by clicking — ${screen}`, async (t) => {
    const user = await makeUser({ name: `Nav ${screen}` });
    const page = await openTab();
    await page.setViewport(viewport);
    await signIn(page, user);

    for (const href of DESTINATIONS) {
      await t.test(href, async () => {
        // Start somewhere other than the destination, and not the home page:
        // its sidebar links to things the masthead might not, and a page
        // that is only reachable from the home page is exactly the kind of
        // gap this is looking for.
        await page.go(href === '/browse' ? '/events' : '/browse');

        const link = await findLink(page, href);
        assert.ok(link, `no visible link to ${href} on a ${screen} screen, not even behind a menu`);

        await Promise.all([
          page.waitForFunction((h) => location.pathname + location.search === h, { timeout: 15000 }, href),
          link.click(),
        ]);
      });
    }

    assert.equal(page.errors.length, 0, page.errors.join(' | '));
    assert.equal(page.failures.length, 0, page.failures.join(' | '));
    await page.close_();
  });
}
