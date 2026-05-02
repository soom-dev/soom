import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Read the bundled runtime produced by `scripts/build-runtime.ts`.
 *
 * R2 ships this loader but does not call it from anywhere. R3 inlines the
 * returned string into HTML alongside `loadAnimeJs()` from anime-loader.ts.
 *
 * NOTE: relative path is correct in dev (`bun run src/cli.ts`) where this
 * module resolves to `src/output/runtime-loader.ts`. After bundling to
 * `dist/cli.js`, `import.meta.url` points at the bundled file; the path math
 * resolves to a sibling of `dist/`, which is `dist-runtime/runtime.js` — also
 * correct as long as both `dist/` and `dist-runtime/` live under the same
 * project root. R3 should re-verify when wiring it up.
 */
export async function loadRuntimeBundle(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundlePath = join(here, '..', '..', 'dist-runtime', 'runtime.js');
  return readFile(bundlePath, 'utf-8');
}
