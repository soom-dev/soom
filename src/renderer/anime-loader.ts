import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

export async function loadAnimeJs(): Promise<string> {
  const require = createRequire(import.meta.url);
  const animeMain = require.resolve('animejs');
  // animeMain resolves to dist/modules/index.cjs — go up to package root
  const pkgRoot = join(dirname(animeMain), '..', '..');
  const bundlePath = join(pkgRoot, 'dist', 'bundles', 'anime.umd.min.js');
  return readFile(bundlePath, 'utf-8');
}
