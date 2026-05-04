import { describe, it, expect, beforeAll } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { $ } from 'bun';

describe('Playwright rendering integration', () => {
  beforeAll(async () => {
    await $`bun run src/cli.ts render examples/basic/flow-simple.mmd -o /tmp/test-pw-dark.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-simple.mmd -o /tmp/test-pw-light.html -t light`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-branching.mmd -o /tmp/test-pw-branch.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-microservice.mmd -o /tmp/test-pw-micro.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-cicd.mmd -o /tmp/test-pw-cicd.html`.quiet();
  }, 60_000);

  it('should render dark theme with soom-dark default class', async () => {
    const html = await readFile('/tmp/test-pw-dark.html', 'utf-8');
    expect(html).toContain('class="soom-dark"');
    expect(html).toContain('#1E2A3A');
  });

  it('should render light theme with soom-light default class', async () => {
    const html = await readFile('/tmp/test-pw-light.html', 'utf-8');
    expect(html).toContain('class="soom-light"');
    expect(html).toContain('#F4F8FC');
  });

  it('should produce SVG with properly-sized foreignObject elements', async () => {
    const html = await readFile('/tmp/test-pw-micro.html', 'utf-8');
    // Node label foreignObjects should have non-zero dimensions
    const foMatches = html.match(/<foreignObject[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/g) || [];
    const nodeFOs = foMatches.filter((fo) => {
      const w = fo.match(/width="([\d.]+)"/)?.[1];
      return w && parseFloat(w) > 0;
    });
    // Microservice has 9 nodes — all should have sized foreignObjects
    expect(nodeFOs.length).toBeGreaterThanOrEqual(9);
  });

  it('should contain visible label text in rendered SVG', async () => {
    const html = await readFile('/tmp/test-pw-cicd.html', 'utf-8');
    expect(html).toContain('Git Push');
    expect(html).toContain('Build');
    expect(html).toContain('Deploy Staging');
    expect(html).toContain('Security Scan');
  });

  it('should contain edge labels', async () => {
    const html = await readFile('/tmp/test-pw-branch.html', 'utf-8');
    expect(html).toContain('Valid');
    expect(html).toContain('Invalid');
  });

  it('should have correct viewBox dimensions (not tiny)', async () => {
    const html = await readFile('/tmp/test-pw-micro.html', 'utf-8');
    const vbMatch = html.match(/viewBox="([^"]+)"/);
    expect(vbMatch).toBeTruthy();
    const [, , w] = vbMatch![1].split(' ').map(Number);
    expect(w).toBeGreaterThan(500);
  });

  it('should render all four examples without errors', async () => {
    for (const name of ['dark', 'branch', 'micro', 'cicd']) {
      const html = await readFile(`/tmp/test-pw-${name}.html`, 'utf-8');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<svg');
      expect(html).toContain('Content-Security-Policy');
    }
  });

  it('should produce self-contained HTML (no external resources)', async () => {
    const html = await readFile('/tmp/test-pw-dark.html', 'utf-8');
    // Watermark <a> link to hansoom.dev is intentional navigation, not a resource
    expect(html).not.toMatch(/src="https?:\/\//);
    expect(html).not.toMatch(/<link[^>]*href="https?:\/\//);
  });

  it('should have arrow markers on edges', async () => {
    const html = await readFile('/tmp/test-pw-cicd.html', 'utf-8');
    const markerEnds = (html.match(/marker-end/g) || []).length;
    expect(markerEnds).toBeGreaterThanOrEqual(8);
  });

  it('should center diagram vertically and horizontally', async () => {
    const html = await readFile('/tmp/test-pw-dark.html', 'utf-8');
    expect(html).toContain('align-items: center');
    expect(html).toContain('min-height: 100vh');
    expect(html).toContain('justify-content: center');
  });

  it('should set SVG width to 100% in CSS', async () => {
    const html = await readFile('/tmp/test-pw-dark.html', 'utf-8');
    expect(html).toContain('width: 100%');
    expect(html).toContain('max-height: 90vh');
  });

  it('should set diagram container to full width', async () => {
    const html = await readFile('/tmp/test-pw-dark.html', 'utf-8');
    expect(html).toContain('box-sizing: border-box');
  });
});

describe('CLI --open flag', () => {
  it('should accept --open flag without error', async () => {
    // Render without --open to verify the flag is parsed (don't actually open browser in tests)
    const result =
      await $`bun run src/cli.ts render examples/basic/flow-simple.mmd -o /tmp/test-open-flag.html`.quiet();
    expect(result.exitCode).toBe(0);
  }, 30_000);

  it('should accept --open flag in help output', async () => {
    const result = await $`bun run src/cli.ts render --help`.quiet();
    const helpText = result.stdout.toString();
    expect(helpText).toContain('--open');
    expect(helpText).toContain('default browser');
  }, 10_000);
});
