import type { Env } from '../env.js';
import { generateId } from '../id.js';
import { getSession } from '../session.js';
import { checkRateLimit } from '../rate-limit.js';

interface SavePayload {
  source: string;
  html: string;
  ogImage?: string;
  title?: string;
}

export async function handleSave(request: Request, env: Env): Promise<Response> {
  const session = await getSession(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { allowed, remaining } = await checkRateLimit(
    env.DB,
    `user:${session.githubId}`,
    'user-save'
  );
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again tomorrow.', remaining }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: SavePayload;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.source || !body.html) {
    return new Response(JSON.stringify({ error: 'source and html are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.html.length > 1_000_000) {
    return new Response(JSON.stringify({ error: 'Rendered HTML exceeds 1MB limit' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = generateId();
  const sourceHash = await sha256(body.source);

  await Promise.all([
    env.BUCKET.put(`diagrams/${id}/output.html`, body.html, {
      httpMetadata: { contentType: 'text/html; charset=utf-8' },
    }),
    env.BUCKET.put(`diagrams/${id}/source.mmd`, body.source, {
      httpMetadata: { contentType: 'text/plain; charset=utf-8' },
    }),
    body.ogImage
      ? env.BUCKET.put(`diagrams/${id}/og.png`, base64ToArrayBuffer(body.ogImage), {
          httpMetadata: { contentType: 'image/png' },
        })
      : Promise.resolve(),
  ]);

  await env.DB.prepare(
    `INSERT INTO diagrams (id, owner_github_id, owner_login, title, source_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, session.githubId, session.login, body.title ?? '', sourceHash, new Date().toISOString())
    .run();

  const url = new URL(request.url);
  return new Response(
    JSON.stringify({ id, url: `${url.origin}/p/${id}` }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleaned = base64.replace(/^data:image\/png;base64,/, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
