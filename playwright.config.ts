import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the public site, run against the production build served
 * the way GitHub Pages serves it. `npm run test:e2e` builds first.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321/Bokamoso-Arts-Institute-/',
    trace: 'off',
    // Some environments ship their own Chromium; point at it with PW_CHROMIUM_PATH.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node scripts/serve-dist.cjs dist 4321',
    url: 'http://127.0.0.1:4321/Bokamoso-Arts-Institute-/',
    reuseExistingServer: true,
  },
});
