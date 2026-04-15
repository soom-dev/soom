import { describe, it, expect, beforeAll } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { $ } from 'bun';

describe('Animation integration', () => {
  beforeAll(async () => {
    await $`bun run src/cli.ts render examples/basic/flow-simple.mmd -o /tmp/test-anim-simple.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-branching.mmd -o /tmp/test-anim-branch.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-microservice.mmd -o /tmp/test-anim-micro.html`.quiet();
    await $`bun run src/cli.ts render examples/basic/flow-cicd.mmd -o /tmp/test-anim-cicd.html`.quiet();
  }, 120_000);

  it('should contain sequence JSON data', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('<script id="soom-sequence" type="application/json">');
    const match = html.match(/<script id="soom-sequence" type="application\/json">([\s\S]*?)<\/script>/);
    expect(match).toBeTruthy();
    const seq = JSON.parse(match![1]);
    expect(seq.steps).toBeDefined();
    expect(seq.steps.length).toBeGreaterThan(0);
  });

  it('should contain annotation panel', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('<div id="soom-annotations">');
  });

  it('should contain glow filter', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('<filter id="soom-glow">');
  });

  it('should contain animation CSS classes', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('soom-node-active');
    expect(html).toContain('soom-node-completed');
    expect(html).toContain('soom-flow-particle');
  });

  it('should use createDrawable in rendered output', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('createDrawable');
  });

  it('should not contain @keyframes soom-march in rendered output', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).not.toContain('@keyframes soom-march');
  });

  it('should render all four examples without errors', async () => {
    for (const name of ['simple', 'branch', 'micro', 'cicd']) {
      const html = await readFile(`/tmp/test-anim-${name}.html`, 'utf-8');
      expect(html).toContain('soomAnimation');
      expect(html).toContain('soom-sequence');
      expect(html).toContain('soom-glow');
      expect(html).toContain('createTimeline');
      expect(html).toContain('createDrawable');
    }
  });

  it('should produce valid sequence JSON for all examples', async () => {
    for (const name of ['simple', 'branch', 'micro', 'cicd']) {
      const html = await readFile(`/tmp/test-anim-${name}.html`, 'utf-8');
      const match = html.match(/<script id="soom-sequence" type="application\/json">([\s\S]*?)<\/script>/);
      expect(match).toBeTruthy();
      const seq = JSON.parse(match![1]);
      expect(seq.steps.length).toBeGreaterThan(0);
      seq.steps.forEach((step: { activateNodes: string[] }) => {
        expect(step.activateNodes.length).toBeGreaterThan(0);
      });
    }
  });
});
