import type { Env } from '../env.js';

export async function handleSource(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/source\/([A-Za-z0-9]{8})$/);
  if (!match) {
    return new Response('Not Found', { status: 404 });
  }

  const id = match[1];
  const obj = await env.BUCKET.get(`diagrams/${id}/source.mmd`);

  if (!obj) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(obj.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
