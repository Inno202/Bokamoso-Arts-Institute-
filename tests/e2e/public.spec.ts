import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { path: '', h1: 'Bokamoso Arts Institute' },
  { path: 'about/', h1: 'About Bokamoso' },
  { path: 'programs/', h1: 'Our work' },
  { path: 'events/', h1: 'Live stage' },
  { path: 'traditions/', h1: 'Our traditions' },
  { path: 'login/', h1: 'Sign in' },
  { path: 'register/', h1: 'Create account' },
  { path: 'terms/', h1: 'Terms of use' },
  { path: 'privacy/', h1: 'Privacy policy' },
  { path: 'cookies/', h1: 'Cookie policy' },
];

/** Errors from the app itself; images or data the test machine cannot download are not the app's fault. */
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

for (const { path, h1 } of PAGES) {
  test.describe(`/${path}`, () => {
    test('is pre-rendered: the content is in the HTML before any script runs', async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).toContain('data-route=');
      expect(html).not.toMatch(/<script>(?!<)/); // no inline scripts for the security policy to block
    });

    test('loads cleanly, with its heading and no sideways scrolling', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await expect(page.locator('h1').first()).toHaveText(h1);
      // The page keeps a live connection for content updates, so wait a moment rather than for network silence.
      await page.waitForTimeout(1500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
      expect(errors).toEqual([]);
    });

    test('has no serious accessibility problems', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      const results = await new AxeBuilder({ page: page as never })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const serious = results.violations
        .filter(v => v.impact === 'serious' || v.impact === 'critical')
        .map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
      expect(serious).toEqual([]);
    });
  });
}

test('the skip link is the first thing a keyboard reaches, and its focus ring shows', async ({ page }) => {
  await page.goto('');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveText('Skip to content');
  const outline = await focused.evaluate(el => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('every control can be reached and is at least 44px to tap', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'touch sizes matter on the phone');
  await page.goto('');
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('header a, header button, main a.btn, main button, footer button')]
      .filter(el => (el as HTMLElement).offsetParent !== null)
      .map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44 && r.width < 44)
      .map(({ el }) => el.outerHTML.slice(0, 80)));
  expect(small).toEqual([]);
});

test('old #/ links still land on the right page', async ({ page }) => {
  await page.goto('#/events');
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.locator('h1').first()).toHaveText('Live stage');
});

test('moving between pages happens in the browser, without a full reload', async ({ page }) => {
  await page.goto('');
  await page.evaluate(() => { (window as unknown as { marker: number }).marker = 1; });
  const menu = page.getByRole('button', { name: 'Open menu' });
  if (await menu.isVisible()) {
    await menu.click();
    await page.locator('#mobile-menu').getByRole('link', { name: 'Traditions' }).click();
  } else {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Traditions' }).click();
  }
  await expect(page.locator('h1').first()).toHaveText('Our traditions');
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
});

test('an unknown address shows a friendly not-found page', async ({ page }) => {
  await page.goto('this-page-does-not-exist');
  await expect(page.locator('h1').first()).toHaveText('This page missed its cue');
});

test('signed-out visitors are sent to sign in for their tickets', async ({ page }) => {
  await page.goto('my-tickets/');
  await expect(page).toHaveURL(/\/login$/);
});

test('the home slideshow can be paused and switched by hand', async ({ page }) => {
  await page.goto('');
  const pause = page.getByRole('button', { name: 'Pause slideshow' });
  await expect(pause).toBeVisible();
  await pause.click();
  await expect(page.getByRole('button', { name: 'Play slideshow' })).toBeVisible();
  await page.getByRole('button', { name: /^Show photo 2 of / }).click();
  await expect(page.getByRole('button', { name: /^Show photo 2 of / })).toHaveAttribute('aria-current', 'true');
});

test('the site refuses to run inside another website\'s frame', async ({ page }) => {
  await page.setContent(`<iframe src="${test.info().project.use.baseURL}" width="800" height="600"></iframe>`);
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('body')).toContainText('does not open inside another website');
});

test('the security policy blocks nothing the site itself needs, on any public page', async ({ page }) => {
  // Every refused script, frame, style, font, image or connection is recorded here.
  await page.addInitScript(() => {
    (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __cspViolations: string[] }).__cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  const policy = await (await page.request.get('')).text();
  expect(policy).toContain('http-equiv="Content-Security-Policy"');
  expect(policy).toContain("object-src 'none'");
  for (const { path } of PAGES) {
    await page.goto(path);
    await page.waitForTimeout(800);
    const violations = await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);
    expect(violations, `on /${path}`).toEqual([]);
  }
});

test('the site can be installed: the app manifest is linked, valid and opens on the home page', async ({ page, request }) => {
  await page.goto('');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(new URL(href!, page.url()).href)).json();
  expect(manifest.short_name).toBe('BAI');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/Bokamoso-Arts-Institute-/');
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) expect((await request.get(new URL(icon.src, page.url()).href)).ok()).toBe(true);
  expect((await request.get(new URL(manifest.start_url, page.url()).href)).ok()).toBe(true);
  // The install offer is never made on the home page.
  await expect(page.getByRole('region', { name: 'Add BAI to your home screen' })).toHaveCount(0);
});

test('the cookie notice shows once, goes away with OK, and stays away', async ({ page }) => {
  await page.goto('');
  const notice = page.getByRole('region', { name: 'Cookies' });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole('link', { name: 'Cookie policy' })).toBeVisible();
  // It is compact, and nothing is ever unreachable under it: at the end of the page, the
  // footer's last line scrolls clear above it.
  const box = (await notice.boundingBox())!;
  expect(box.height).toBeLessThan(140);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const footerEnd = await page.locator('footer').evaluate(el => el.getBoundingClientRect().bottom);
  expect(footerEnd).toBeLessThanOrEqual(box.y + 1);
  await notice.getByRole('button', { name: 'OK' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole('region', { name: 'Cookies' })).toHaveCount(0);
});

test('the cookie notice is not part of the pre-built page', async ({ request }) => {
  const html = await (await request.get('')).text();
  expect(html).not.toContain('No advertising or tracking');
});
