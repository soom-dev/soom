import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, rm } from 'node:fs/promises';
import { buildPayload, type TelemetryPayload } from '../../src/telemetry/payload.js';
import { sendTelemetry } from '../../src/telemetry/send.js';
import type { AnimaGraph } from '../../src/types.js';

const ALLOWED_KEYS: ReadonlySet<keyof TelemetryPayload> = new Set([
  'version',
  'os',
  'nodeCount',
  'edgeCount',
  'hasSubgraphs',
  'theme',
  'usedOpen',
  'renderTimeMs',
  'diagramType',
  'ts',
]);

function makeGraph(nodeCount: number, edgeCount: number): AnimaGraph {
  const nodes = new Map();
  for (let i = 0; i < nodeCount; i++) {
    nodes.set(`n${i}`, { id: `n${i}`, label: `N${i}`, type: 'default', position: { x: 0, y: 0, width: 10, height: 10 } });
  }
  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    id: `e${i}`, source: 'n0', target: 'n1', path: '', style: 'solid' as const,
  }));
  return {
    nodes,
    edges,
    subgraphs: [],
    metadata: { sourceFormat: 'mermaid', sourceText: '' },
  };
}

describe('buildPayload', () => {
  it('returns exactly the 10 allowed keys — no more, no less', () => {
    const graph = makeGraph(3, 2);
    const payload = buildPayload('flowchart LR\n  A-->B', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 123,
    });

    const keys = Object.keys(payload) as (keyof TelemetryPayload)[];
    expect(keys).toHaveLength(10);
    for (const k of keys) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
    for (const k of ALLOWED_KEYS) {
      expect(keys).toContain(k);
    }
  });

  it('detects diagram type from first non-comment line', () => {
    const graph = makeGraph(1, 0);
    const p = buildPayload('%% comment\nsequenceDiagram\n  A->>B: hi', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 0,
    });
    expect(p.diagramType).toBe('sequencediagram');
  });

  it('returns unknown for empty source', () => {
    const graph = makeGraph(0, 0);
    const p = buildPayload('', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 0,
    });
    expect(p.diagramType).toBe('unknown');
  });

  it('detects subgraphs correctly', () => {
    const graph = makeGraph(2, 1);
    const withSub = buildPayload('flowchart LR\n  subgraph A\n    B\n  end', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 0,
    });
    const withoutSub = buildPayload('flowchart LR\n  A-->B', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 0,
    });
    expect(withSub.hasSubgraphs).toBe(true);
    expect(withoutSub.hasSubgraphs).toBe(false);
  });

  it('reflects nodeCount and edgeCount from graph', () => {
    const graph = makeGraph(5, 4);
    const p = buildPayload('graph TD\n  A-->B', graph, {
      version: '0.1.0', theme: 'light', usedOpen: true, renderTimeMs: 42,
    });
    expect(p.nodeCount).toBe(5);
    expect(p.edgeCount).toBe(4);
    expect(p.theme).toBe('light');
    expect(p.usedOpen).toBe(true);
    expect(p.renderTimeMs).toBe(42);
  });

  it('payload body contains no file path separators or .mmd/.html extensions', () => {
    const graph = makeGraph(1, 0);
    const p = buildPayload('flowchart LR', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 0,
    });
    const body = JSON.stringify(p);
    expect(body).not.toMatch(/\.(mmd|html)/);
    expect(body).not.toMatch(/\//);
    expect(body).not.toMatch(/\\/);
  });
});

describe('sendTelemetry — opt-out gates fetch', () => {
  const tmpPrefs = join(tmpdir(), `soom-send-test-${process.pid}.json`);
  let fetchCalls: RequestInfo[] = [];
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchCalls = [];
    globalThis.fetch = async (input: RequestInfo | URL) => {
      fetchCalls.push(input as RequestInfo);
      return new Response(null, { status: 204 });
    };
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(tmpPrefs, { force: true });
  });

  it('does NOT call fetch when enabled:false', async () => {
    await writeFile(tmpPrefs, JSON.stringify({ enabled: false }));
    const graph = makeGraph(1, 0);
    const payload = buildPayload('flowchart LR', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 0,
    });
    await sendTelemetry(payload, tmpPrefs);
    expect(fetchCalls).toHaveLength(0);
  });

  it('does NOT call fetch when prefs file absent', async () => {
    const graph = makeGraph(1, 0);
    const payload = buildPayload('flowchart LR', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 0,
    });
    await sendTelemetry(payload, tmpPrefs);
    expect(fetchCalls).toHaveLength(0);
  });

  it('calls fetch exactly once when enabled:true', async () => {
    await writeFile(tmpPrefs, JSON.stringify({ enabled: true }));
    const graph = makeGraph(2, 1);
    const payload = buildPayload('flowchart LR\n  A-->B', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 5,
    });
    await sendTelemetry(payload, tmpPrefs);
    expect(fetchCalls).toHaveLength(1);
  });

  it('body sent when enabled:true has exactly the 10 allowed keys', async () => {
    await writeFile(tmpPrefs, JSON.stringify({ enabled: true }));
    let capturedBody: string | null = null;
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = init?.body as string ?? null;
      return new Response(null, { status: 204 });
    };
    const graph = makeGraph(3, 2);
    const payload = buildPayload('sequenceDiagram\n  A->>B: hi', graph, {
      version: '0.1.0', theme: 'light', usedOpen: true, renderTimeMs: 99,
    });
    await sendTelemetry(payload, tmpPrefs);
    expect(capturedBody).not.toBeNull();
    const parsed = JSON.parse(capturedBody!);
    const keys = Object.keys(parsed);
    expect(keys).toHaveLength(10);
    for (const k of keys) {
      expect(ALLOWED_KEYS.has(k as keyof TelemetryPayload)).toBe(true);
    }
  });

  it('swallows fetch errors without throwing', async () => {
    await writeFile(tmpPrefs, JSON.stringify({ enabled: true }));
    globalThis.fetch = async () => { throw new Error('network down'); };
    const graph = makeGraph(1, 0);
    const payload = buildPayload('flowchart LR', graph, {
      version: '0.1.0', theme: 'dark', usedOpen: false, renderTimeMs: 0,
    });
    await expect(sendTelemetry(payload, tmpPrefs)).resolves.toBeUndefined();
  });
});
