import { describe, it, expect } from 'bun:test';
import { loadAnimeJs } from '../../src/output/anime-loader.js';

// anime.js used to ship as a separate UMD <script>; the runtime now inlines
// the tree-shaken subset directly, so the loader is a stub returning ''.
// Kept as a function rather than ripped out so html.ts stays untouched on
// the bundle-size-audit branch.
describe('loadAnimeJs', () => {
  it('returns an empty string (anime.js is inlined into the runtime bundle)', async () => {
    const result = await loadAnimeJs();
    expect(typeof result).toBe('string');
    expect(result).toBe('');
  });
});
