// Hansoom CLI telemetry receiver.
//
// Contract: POST /v1/render with a JSON body containing exactly the 10 fields
// listed in ALLOWED_FIELDS. Any extra field, missing field, or wrong-typed
// field returns 400 with no row written. No request headers are logged; no
// IP is recorded; no derivable identity makes it past this file.

interface Env {
  DB: D1Database;
}

const ALLOWED_FIELDS = [
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
] as const;

type Payload = {
  version: string;
  os: string;
  nodeCount: number;
  edgeCount: number;
  hasSubgraphs: boolean;
  theme: string;
  usedOpen: boolean;
  renderTimeMs: number;
  diagramType: string;
  ts: string;
};

function validate(body: unknown): Payload | null {
  if (typeof body !== 'object' || body === null) return null;
  const obj = body as Record<string, unknown>;

  // Reject any extra keys beyond the allowlist.
  for (const key of Object.keys(obj)) {
    if (!(ALLOWED_FIELDS as readonly string[]).includes(key)) return null;
  }

  // All allowlisted keys must be present.
  for (const key of ALLOWED_FIELDS) {
    if (!(key in obj)) return null;
  }

  if (typeof obj.version !== 'string') return null;
  if (typeof obj.os !== 'string') return null;
  if (typeof obj.nodeCount !== 'number' || !Number.isFinite(obj.nodeCount)) return null;
  if (typeof obj.edgeCount !== 'number' || !Number.isFinite(obj.edgeCount)) return null;
  if (typeof obj.hasSubgraphs !== 'boolean') return null;
  if (typeof obj.theme !== 'string') return null;
  if (typeof obj.usedOpen !== 'boolean') return null;
  if (typeof obj.renderTimeMs !== 'number' || !Number.isFinite(obj.renderTimeMs)) return null;
  if (typeof obj.diagramType !== 'string') return null;
  if (typeof obj.ts !== 'string') return null;

  return obj as unknown as Payload;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/v1/render') {
      return new Response('Not Found', { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const payload = validate(body);
    if (!payload) {
      return new Response('Bad Request', { status: 400 });
    }

    await env.DB.prepare(
      `INSERT INTO renders (
        ts, received_at, version, os, node_count, edge_count,
        has_subgraphs, theme, used_open, render_time_ms, diagram_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        payload.ts,
        new Date().toISOString(),
        payload.version,
        payload.os,
        payload.nodeCount,
        payload.edgeCount,
        payload.hasSubgraphs ? 1 : 0,
        payload.theme,
        payload.usedOpen ? 1 : 0,
        payload.renderTimeMs,
        payload.diagramType,
      )
      .run();

    return new Response(null, { status: 204 });
  },
};
