/**
 * Renders real pages in headless Chrome and reports what actually paints.
 *
 * This exists because `npm run build` and `npm run lint` both pass happily
 * on a page that renders nothing — they cannot see runtime CSS. A listing
 * grid once vanished entirely because Panel's wrapper was `display: inline`
 * (an <a> from `as={Link}`), and clip-path on an inline element clips the
 * inline box rather than the block children. Nothing but a browser catches
 * that class of bug.
 *
 * Usage (both dev servers must already be running):
 *   npm run check:ui                      # checks the default page set
 *   npm run check:ui -- browse login      # checks specific routes
 *
 * Leading slashes are optional on purpose: Git Bash on Windows rewrites a
 * bare "/browse" argument into a filesystem path (C:/Program Files/browse)
 * before the script ever sees it, so routes are normalised below.
 *
 * Screenshots land in client/.ui-check/ (gitignored).
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const BASE = process.env.UI_CHECK_BASE || 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', '.ui-check');
const DEFAULT_ROUTES = ['/', '/browse', '/login', '/register'];

const findChrome = () => {
  const found = CHROME_CANDIDATES.find((p) => p && fs.existsSync(p));
  if (!found) {
    console.error('No Chrome or Edge found. Set one of the paths in CHROME_CANDIDATES.');
    process.exit(1);
  }
  return found;
};

// "browse" -> "/browse", and undo the Git Bash path mangling described above.
const normaliseRoute = (raw) => {
  let route = String(raw).trim();
  const mangled = route.match(/^[A-Za-z]:[\\/].*?[\\/]([^\\/]+)$/);
  if (mangled) route = mangled[1];
  if (!route.startsWith('/')) route = '/' + route;
  return route;
};

(async () => {
  const args = process.argv.slice(2);
  const routes = args.length ? args.map(normaliseRoute) : DEFAULT_ROUTES;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let failures = 0;

  for (const route of routes) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });

    const errors = [];
    const badRequests = [];

    // A signed-out visitor always produces these: the boot-time session check
    // asks who they are, gets 401, the interceptor tries a refresh, gets 401.
    // That is the correct answer to "is anyone signed in", not a failure — and
    // a checker that reports it on every run trains you to ignore the output.
    const isExpectedAuthMiss = (url, status) =>
      status === 401 && (url.includes('/users/me') || url.includes('/auth/refresh-token'));

    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      // Chrome logs a generic line for every failed fetch; the response
      // handler below already judges those properly.
      if (text.includes('Failed to load resource')) return;
      errors.push(text);
    });
    page.on('response', (r) => {
      if (r.status() < 400) return;
      if (isExpectedAuthMiss(r.url(), r.status())) return;
      badRequests.push(`${r.status()} ${r.url()}`);
    });

    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle0', timeout: 30000 });
    } catch (e) {
      console.log(`\n${route}\n  COULD NOT LOAD — ${e.message}`);
      failures++;
      await page.close();
      continue;
    }

    // Let the GSAP entrance sequence finish before judging what is visible.
    await new Promise((r) => setTimeout(r, 2000));

    const report = await page.evaluate(() => {
      // Anything clipped to nothing, or zero-sized, is effectively invisible
      // even though it is present in the DOM.
      const wrappers = [...document.querySelectorAll('.panel')].map((p) => p.parentElement);
      const invisible = wrappers.filter((el) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return (
          cs.visibility === 'hidden' ||
          Number(cs.opacity) === 0 ||
          r.width === 0 ||
          r.height === 0 ||
          /inset\(.*100%/.test(cs.clipPath || '') ||
          // clip-path on an inline box silently erases block children
          (cs.clipPath !== 'none' && cs.display === 'inline')
        );
      });

      return {
        text: (document.body.innerText || '').trim(),
        panels: document.querySelectorAll('.panel').length,
        invisiblePanels: invisible.length,
      };
    });

    const problems = [];
    if (report.text.length < 40) problems.push('almost nothing rendered');
    if (report.invisiblePanels > 0) problems.push(`${report.invisiblePanels} invisible panel(s)`);
    if (errors.length) problems.push(`${errors.length} console error(s)`);
    if (badRequests.length) problems.push(`${badRequests.length} failed request(s)`);

    const shot = path.join(OUT_DIR, (route === '/' ? 'home' : route.replace(/\W+/g, '-')) + '.png');
    await page.screenshot({ path: shot, fullPage: true });

    if (problems.length) {
      failures++;
      console.log(`\n${route}  — ${problems.join(', ')}`);
      [...new Set(errors)].slice(0, 5).forEach((e) => console.log(`    error: ${e.slice(0, 200)}`));
      [...new Set(badRequests)].slice(0, 5).forEach((r) => console.log(`    ${r.slice(0, 160)}`));
    } else {
      console.log(`\n${route}  — ok (${report.panels} panels, ${report.text.length} chars of text)`);
    }
    console.log(`    ${shot}`);

    await page.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} route(s) with problems.` : '\nAll routes rendered cleanly.');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('check-ui failed:', e.message);
  process.exit(1);
});
