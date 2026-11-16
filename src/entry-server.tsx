/**
 * Build-time renderer. scripts/prerender.mjs loads this to turn each public route
 * into finished HTML, so pages appear instantly and search engines can read them.
 * It never runs in the browser and has no access to anyone's account.
 */
import { StrictMode, type ReactNode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App, { PRERENDERED_ROUTES } from './App';
import { seedContent } from './content/store';
import { resolveSection, SECTION_KEYS, type SectionKey } from './content/sections';

export { PRERENDERED_ROUTES };

/** Validates captured content the same way the live site does, and loads it for rendering. */
export function prepareContent(raw: Partial<Record<SectionKey, unknown>>) {
  const clean: Partial<Record<SectionKey, unknown>> = {};
  for (const key of SECTION_KEYS) if (raw[key] !== undefined) clean[key] = resolveSection(key, raw[key]);
  seedContent(clean);
  return clean;
}

export async function render(url: string, basename: string): Promise<string> {
  const tree = (
    <StrictMode>
      <App router={({ children }: { children: ReactNode }) => <StaticRouter location={url} basename={basename}>{children}</StaticRouter>} />
    </StrictMode>
  );
  // First pass: lets every on-demand page module finish loading.
  const { prelude } = await prerenderToNodeStream(tree);
  for await (const _chunk of prelude) { /* drain */ }
  // Second pass: everything is loaded, so the HTML comes out complete, with no
  // inline scripts (which the Content-Security-Policy would rightly block).
  return renderToString(tree);
}
