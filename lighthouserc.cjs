// Lighthouse CI: speed, accessibility, good practice and search checks on the built site.
// Runs in .github/workflows/lighthouse.yml on every pull request and push to main.
// It is a separate check: a low score shows as a red cross but never stops publishing.
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/serve-dist.cjs dist 4321',
      startServerReadyPattern: 'Serving',
      url: ['', 'about/', 'events/', 'programs/', 'login/'].map(p => `http://127.0.0.1:4321/Bokamoso-Arts-Institute-/${p}`),
      numberOfRuns: 1,
      settings: {
        // Mobile is Lighthouse's default (a mid-range phone on a slowed connection).
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
