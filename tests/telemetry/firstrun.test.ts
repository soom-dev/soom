import { describe, it, expect, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { showNoticeIfFirstRun } from '../../src/telemetry/notice.js';
import { readPrefs } from '../../src/telemetry/prefs.js';

const tmpPrefs = join(tmpdir(), `soom-notice-test-${process.pid}.json`);

afterEach(async () => {
  await rm(tmpPrefs, { force: true });
});

describe('showNoticeIfFirstRun', () => {
  it('prints notice to stderr and writes enabled:true when file absent', async () => {
    const chunks: string[] = [];
    const original = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: any, ...args: any[]) => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    };
    try {
      await showNoticeIfFirstRun(tmpPrefs);
    } finally {
      process.stderr.write = original;
    }

    expect(chunks.join('')).toContain('soom telemetry disable');
    expect(chunks.join('')).toContain('https://hansoom.dev/telemetry');

    const prefs = await readPrefs(tmpPrefs);
    expect(prefs).toEqual({ enabled: true });
  });

  it('does NOT re-print notice on second invocation (file already present)', async () => {
    await showNoticeIfFirstRun(tmpPrefs);

    const chunks: string[] = [];
    const original = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: any, ...args: any[]) => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    };
    try {
      await showNoticeIfFirstRun(tmpPrefs);
    } finally {
      process.stderr.write = original;
    }

    expect(chunks).toHaveLength(0);
  });

  it('does NOT print notice when explicitly disabled', async () => {
    const { writePrefs } = await import('../../src/telemetry/prefs.js');
    await writePrefs({ enabled: false }, tmpPrefs);

    const chunks: string[] = [];
    const original = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: any, ...args: any[]) => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    };
    try {
      await showNoticeIfFirstRun(tmpPrefs);
    } finally {
      process.stderr.write = original;
    }

    expect(chunks).toHaveLength(0);
  });
});
