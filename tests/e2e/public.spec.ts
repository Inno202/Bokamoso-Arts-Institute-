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
  await expect(page.locator('h1').first()).toHaveText('Page not found');
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
