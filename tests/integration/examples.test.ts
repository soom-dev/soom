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

  it('should embed the scene JSON payload', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('<script id="soom-scene" type="application/json">');
    const match = html.match(
      /<script id="soom-scene" type="application\/json">([\s\S]*?)<\/script>/
    );
    expect(match).toBeTruthy();
    const scene = JSON.parse(match![1]);
    expect(scene.version).toBe(1);
    expect(scene.steps).toBeDefined();
    expect(scene.steps.length).toBeGreaterThan(0);
    expect(scene.elements).toBeDefined();
  });

  it('should contain annotation panel', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('<div id="soom-annotations">');
  });

  it('should reference the v2 runtime CSS class names', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('soom-node-active');
    expect(html).toContain('soom-node-completed');
    expect(html).toContain('soom-edge-completed');
  });

  it('should boot the runtime with bootRuntime(scene)', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).toContain('bootRuntime');
    expect(html).toContain("getElementById('soom-scene')");
  });

  it('should not contain v1 codegen markers', async () => {
    const html = await readFile('/tmp/test-anim-simple.html', 'utf-8');
    expect(html).not.toContain('<script id="soom-sequence"');
    expect(html).not.toContain('<!-- runtime:');
  });

  it('should render all four examples with v2 markers', async () => {
    for (const name of ['simple', 'branch', 'micro', 'cicd']) {
      const html = await readFile(`/tmp/test-anim-${name}.html`, 'utf-8');
      expect(html).toContain('soomAnimation');
      expect(html).toContain('soom-scene');
      expect(html).toContain('bootRuntime');
    }
  });

  it('should produce a valid AnimationScene for each example', async () => {
    for (const name of ['simple', 'branch', 'micro', 'cicd']) {
      const html = await readFile(`/tmp/test-anim-${name}.html`, 'utf-8');
      const match = html.match(
        /<script id="soom-scene" type="application\/json">([\s\S]*?)<\/script>/
      );
      expect(match).toBeTruthy();
      const scene = JSON.parse(match![1]);
      expect(scene.version).toBe(1);
      expect(scene.steps.length).toBeGreaterThan(0);
      scene.steps.forEach((step: { activate: { nodes: string[]; edges: string[] } }) => {
        expect(step.activate).toBeDefined();
        expect(step.activate.nodes.length + step.activate.edges.length).toBeGreaterThan(0);
      });
    }
  });
});
