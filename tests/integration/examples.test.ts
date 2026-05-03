import { describe, it, expect, beforeAll } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { $ } from 'bun';

// TODO(R7): v1 runtime was deleted in R6. Reconcile assertions to the v2
// markers (`<script id="soom-scene">`, IIFE bundle, `bootRuntime(...)` boot
// call) and re-enable. The current assertions target v1's `<script id=
// "soom-sequence">` and codegen-specific symbols and will never match v2.
describe.skip('Animation integration (v1-pinned, awaiting R7 reconciliation)', () => {
  beforeAll(async () => {
    await $`HANSOOM_RUNTIME=v1 bun run src/cli.ts render examples/basic/flow-simple.mmd -o /tmp/test-anim-simple.html`.quiet();
    await $`HANSOOM_RUNTIME=v1 bun run src/cli.ts render examples/basic/flow-branching.mmd -o /tmp/test-anim-branch.html`.quiet();
    await $`HANSOOM_RUNTIME=v1 bun run src/cli.ts render examples/basic/flow-microservice.mmd -o /tmp/test-anim-micro.html`.quiet();
    await $`HANSOOM_RUNTIME=v1 bun run src/cli.ts render examples/basic/flow-cicd.mmd -o /tmp/test-anim-cicd.html`.quiet();
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
