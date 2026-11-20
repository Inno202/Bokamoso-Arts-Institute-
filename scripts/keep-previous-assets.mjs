/**
 * Run after `npm run build`, before publishing dist/ to GitHub Pages.
 *
 * Someone may still have the previous version open (or their browser may reopen it from
 * its own copy). That version asks for its own script files, whose names change with
 * every build. Publishing replaces the whole site, so without this those files would be
 * gone and the page would fail to open the next screen ("Update available").
 *
 * This copies the previous release's files into dist/assets (never overwriting the new
 * ones) and records this release's files in dist/assets-manifest.json, so each publish
 * keeps exactly one release back and the folder never grows beyond two releases.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');
const BRANCH = 'origin/gh-pages';
const git = (...args) => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });

if (!existsSync(ASSETS)) {
  console.error('keep-previous-assets: run the build first (dist/assets is missing).');
  process.exit(1);
}
// Only the build's own files (scripts, styles, fonts); folders of site photos are always published.
const current = readdirSync(ASSETS, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name);

let previous = [];
try {
  git('fetch', '--quiet', 'origin', 'gh-pages');
  try {
    previous = JSON.parse(git('show', `${BRANCH}:assets-manifest.json`).toString()).files || [];
  } catch {
    // First publish with this script: everything live now belongs to the previous release.
    previous = git('ls-tree', '--name-only', `${BRANCH}:assets`).toString().split('\n').filter(Boolean);
  }
} catch {
  console.warn('keep-previous-assets: could not read the published site; publishing without the previous release.');
}

let kept = 0;
for (const name of previous) {
  if (!/^[\w.-]+\.\w+$/.test(name) || current.includes(name)) continue;
  try {
    writeFileSync(join(ASSETS, name), git('show', `${BRANCH}:assets/${name}`));
    kept += 1;
  } catch { /* no longer there: nothing to keep */ }
}

writeFileSync(join(DIST, 'assets-manifest.json'), JSON.stringify({ files: current }, null, 2));
console.log(`keep-previous-assets: ${current.length} new files, ${kept} kept from the previous release.`);
