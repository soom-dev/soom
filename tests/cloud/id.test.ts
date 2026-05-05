import { describe, expect, test } from 'bun:test';
import { generateId } from '../../cloud/src/id.js';

describe('generateId', () => {
  test('produces 8-character string', () => {
    const id = generateId();
    expect(id).toHaveLength(8);
  });

  test('uses only base62 characters', () => {
    for (let i = 0; i < 100; i++) {
      const id = generateId();
      expect(id).toMatch(/^[0-9A-Za-z]{8}$/);
    }
  });

  test('produces unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });
});
