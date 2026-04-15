import { describe, it, expect, beforeAll } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { $ } from 'bun';

describe('Theme rendering', () => {
  beforeAll(async () => {
    await $`bun run src/cli.ts render examples/basic/flow-simple.mmd -o /tmp/test-theme-dark.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-simple.mmd -o /tmp/test-theme-light.html -t light`.quiet();
  }, 60_000);

  it('should render dark theme with soom-dark default class', async () => {
    const html = await readFile('/tmp/test-theme-dark.html', 'utf-8');
    expect(html).toContain('class="soom-dark"');
    expect(html).toContain('#1E2A3A');
  });

  it('should render light theme with soom-light default class', async () => {
    const html = await readFile('/tmp/test-theme-light.html', 'utf-8');
    expect(html).toContain('class="soom-light"');
    expect(html).toContain('#F8F6FF');
  });

  it('should use CSS custom properties', async () => {
    const html = await readFile('/tmp/test-theme-dark.html', 'utf-8');
    expect(html).toContain('var(--soom-bg)');
    expect(html).toContain('var(--soom-accent)');
    expect(html).toContain('var(--soom-text)');
  });

  it('should center diagram vertically and horizontally', async () => {
    const html = await readFile('/tmp/test-theme-dark.html', 'utf-8');
    expect(html).toContain('align-items: center');
    expect(html).toContain('min-height: 100vh');
    expect(html).toContain('justify-content: center');
  });

  it('should set SVG width to 100% in CSS', async () => {
    const html = await readFile('/tmp/test-theme-dark.html', 'utf-8');
    expect(html).toContain('width: 100%');
    expect(html).toContain('max-height: 90vh');
  });

  it('should set diagram container to full width', async () => {
    const html = await readFile('/tmp/test-theme-dark.html', 'utf-8');
    expect(html).toContain('box-sizing: border-box');
  });
});
