import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Read the bundled runtime produced by `scripts/build-runtime.ts`.
 *
 * Two execution modes resolve `import.meta.url` to different depths:
 *   - dev (`bun run src/cli.ts`): module is `src/output/runtime-loader.ts`,
 *     so the project root is two levels up.
 *   - bundled (`node dist/cli.js`): module is collapsed into `dist/cli.js`,
 *     so the project root is one level up.
 *
 * Both candidate paths are tried in order; the first that exists wins.
 * R6 will revisit when the legacy codegen is removed and the runtime moves
 * from `dist-runtime/` into the main bundle.
 */
export async function loadRuntimeBundle(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '..', '..', 'dist-runtime', 'runtime.js'),
    join(here, '..', 'dist-runtime', 'runtime.js'),
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf-8');
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    `soom: runtime bundle not found. Run \`bun run build\` first. Tried: ${candidates.join(', ')}`
  );
}
