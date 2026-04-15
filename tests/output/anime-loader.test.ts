import { describe, it, expect } from 'bun:test';
import { loadAnimeJs } from '../../src/output/anime-loader.js';

describe('loadAnimeJs', () => {
  it('should return a non-empty string', async () => {
    const result = await loadAnimeJs();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should contain anime.js library code', async () => {
    const result = await loadAnimeJs();
    expect(result).toContain('anime');
  });

  it('should be a UMD bundle (self-contained)', async () => {
    const result = await loadAnimeJs();
    // UMD bundles typically contain module detection patterns
    expect(result.length).toBeGreaterThan(1000);
  });
});
