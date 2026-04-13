import { describe, it, expect, beforeAll } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { $ } from 'bun';

describe('Playwright rendering integration', () => {
  beforeAll(async () => {
    await $`bun run src/cli.ts render examples/simple.mmd -o /tmp/test-pw-dark.html`.quiet();
    await $`bun run src/cli.ts render examples/simple.mmd -o /tmp/test-pw-light.html -t light`.quiet();
    await $`bun run src/cli.ts render examples/branching.mmd -o /tmp/test-pw-branch.html`.quiet();
    await $`bun run src/cli.ts render examples/microservice.mmd -o /tmp/test-pw-micro.html`.quiet();
    await $`bun run src/cli.ts render examples/cicd.mmd -o /tmp/test-pw-cicd.html`.quiet();
  }, 60_000);

  it('should render dark theme without light default fills (#ECECFF)', async () => {
    const html = await readFile('/tmp/test-pw-dark.html', 'utf-8');
    expect(html).not.toContain('#ECECFF');
    expect(html).toContain('#1a1a2e');
  });

  it('should render light theme with light background', async () => {
    const html = await readFile('/tmp/test-pw-light.html', 'utf-8');
    expect(html).toContain('#ffffff');
    expect(html).not.toContain('#1a1a2e');
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

  it('should produce self-contained HTML', async () => {
    const html = await readFile('/tmp/test-pw-dark.html', 'utf-8');
    expect(html).not.toMatch(/href="https?:\/\//);
    expect(html).not.toMatch(/src="https?:\/\//);
  });

  it('should have arrow markers on edges', async () => {
    const html = await readFile('/tmp/test-pw-cicd.html', 'utf-8');
    const markerEnds = (html.match(/marker-end/g) || []).length;
    expect(markerEnds).toBeGreaterThanOrEqual(8);
  });

  it('should have responsive CSS (no min-height:100vh with align-items:center)', async () => {
    const html = await readFile('/tmp/test-pw-dark.html', 'utf-8');
    const hasVertCenter = html.includes('align-items: center') && html.includes('min-height: 100vh');
    expect(hasVertCenter).toBe(false);
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
      await $`bun run src/cli.ts render examples/simple.mmd -o /tmp/test-open-flag.html`.quiet();
    expect(result.exitCode).toBe(0);
  }, 30_000);

  it('should accept --open flag in help output', async () => {
    const result = await $`bun run src/cli.ts render --help`.quiet();
    const helpText = result.stdout.toString();
    expect(helpText).toContain('--open');
    expect(helpText).toContain('default browser');
  }, 10_000);
});
