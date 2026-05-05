import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { readPrefs, writePrefs } from '../../src/telemetry/prefs.js';

const tmpPrefs = join(tmpdir(), `soom-test-prefs-${process.pid}.json`);

afterEach(async () => {
  await rm(tmpPrefs, { force: true });
});

describe('readPrefs', () => {
  it('returns null when file does not exist', async () => {
    const result = await readPrefs(tmpPrefs);
    expect(result).toBeNull();
  });

  it('returns enabled:true when file says so', async () => {
    await writeFile(tmpPrefs, JSON.stringify({ enabled: true }));
    const result = await readPrefs(tmpPrefs);
    expect(result).toEqual({ enabled: true });
  });

  it('returns enabled:false when file says so', async () => {
    await writeFile(tmpPrefs, JSON.stringify({ enabled: false }));
    const result = await readPrefs(tmpPrefs);
    expect(result).toEqual({ enabled: false });
  });

  it('returns null for malformed JSON', async () => {
    await writeFile(tmpPrefs, 'not-json');
    const result = await readPrefs(tmpPrefs);
    expect(result).toBeNull();
  });
});

describe('writePrefs', () => {
  it('writes enabled:true and round-trips correctly', async () => {
    await writePrefs({ enabled: true }, tmpPrefs);
    const result = await readPrefs(tmpPrefs);
    expect(result).toEqual({ enabled: true });
  });

  it('writes enabled:false and round-trips correctly', async () => {
    await writePrefs({ enabled: false }, tmpPrefs);
    const result = await readPrefs(tmpPrefs);
    expect(result).toEqual({ enabled: false });
  });

  it('creates parent directories if needed', async () => {
    const nested = join(tmpdir(), `soom-test-nested-${process.pid}`, 'telemetry.json');
    try {
      await writePrefs({ enabled: true }, nested);
      const result = await readPrefs(nested);
      expect(result).toEqual({ enabled: true });
    } finally {
      await rm(join(tmpdir(), `soom-test-nested-${process.pid}`), { recursive: true, force: true });
    }
  });
});
