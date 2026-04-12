import { describe, it, expect, beforeAll } from 'bun:test';
import { fixForeignObjects } from '../src/renderer/svg-viewbox.js';
import { readFile } from 'node:fs/promises';
import { $ } from 'bun';

describe('fixForeignObjects', () => {
  it('should set non-zero dimensions on foreignObject with width="0"', () => {
    const svg = `<svg><foreignObject width="0" height="0"><div>Hello World</div></foreignObject></svg>`;
    const result = fixForeignObjects(svg);
    expect(result).not.toContain('width="0"');
    expect(result).not.toContain('height="0"');
    expect(result).toMatch(/width="99"/);
    expect(result).toMatch(/height="24"/);
  });

  it('should preserve foreignObject elements that already have dimensions', () => {
    const svg = `<svg><foreignObject width="150" height="40"><div>Label</div></foreignObject></svg>`;
    const result = fixForeignObjects(svg);
    expect(result).toContain('width="150"');
    expect(result).toContain('height="40"');
  });

  it('should handle short labels with minimum width', () => {
    const svg = `<svg><foreignObject width="0" height="0"><span>Hi</span></foreignObject></svg>`;
    const result = fixForeignObjects(svg);
    expect(result).toContain('width="60"');
  });

  it('should handle multiple foreignObject elements', () => {
    const svg = `<svg>
      <foreignObject width="0" height="0"><div>Start</div></foreignObject>
      <foreignObject width="0" height="0"><div>Process</div></foreignObject>
      <foreignObject width="0" height="0"><div>End</div></foreignObject>
    </svg>`;
    const result = fixForeignObjects(svg);
    const matches = result.match(/foreignObject width="[1-9]/g);
    expect(matches).toHaveLength(3);
  });

  it('should preserve inner HTML content', () => {
    const svg = `<svg><foreignObject width="0" height="0"><div class="nodeLabel"><span>My Label</span></div></foreignObject></svg>`;
    const result = fixForeignObjects(svg);
    expect(result).toContain('class="nodeLabel"');
    expect(result).toContain('My Label');
  });
});

describe('Theme and label integration', () => {
  // Render examples via CLI subprocess to avoid DOMPurify module cache issues.
  // Timeout increased for CI where subprocess startup is slower.
  beforeAll(async () => {
    await $`bun run src/cli.ts render examples/simple.mmd -o /tmp/test-int-dark.html`.quiet();
    await $`bun run src/cli.ts render examples/simple.mmd -o /tmp/test-int-light.html -t light`.quiet();
    await $`bun run src/cli.ts render examples/branching.mmd -o /tmp/test-int-branch.html`.quiet();
    await $`bun run src/cli.ts render examples/microservice.mmd -o /tmp/test-int-micro.html`.quiet();
    await $`bun run src/cli.ts render examples/cicd.mmd -o /tmp/test-int-cicd.html`.quiet();
  }, 30_000);

  it('should not contain light default fills (#ECECFF) in dark theme', async () => {
    const html = await readFile('/tmp/test-int-dark.html', 'utf-8');
    expect(html).not.toContain('#ECECFF');
    expect(html).toContain('#1a1a2e');
  });

  it('should use light background for light theme', async () => {
    const html = await readFile('/tmp/test-int-light.html', 'utf-8');
    expect(html).toContain('#ffffff');
    expect(html).not.toContain('#1a1a2e');
  });

  it('should have no zero-width foreignObject in any example', async () => {
    const files = ['dark', 'branch', 'micro', 'cicd'].map((n) => `/tmp/test-int-${n}.html`);
    for (const f of files) {
      const html = await readFile(f, 'utf-8');
      const zeroFOs = (html.match(/foreignObject width="0"/g) || []).length;
      expect(zeroFOs).toBe(0);
    }
  });

  it('should have readable label text in rendered SVG', async () => {
    const html = await readFile('/tmp/test-int-cicd.html', 'utf-8');
    expect(html).toContain('Git Push');
    expect(html).toContain('Build');
    expect(html).toContain('Deploy Staging');
  });

  it('should have visible edge labels', async () => {
    const html = await readFile('/tmp/test-int-branch.html', 'utf-8');
    expect(html).toContain('Valid');
    expect(html).toContain('Invalid');
  });
});
