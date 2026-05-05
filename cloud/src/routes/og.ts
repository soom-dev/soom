import type { Env } from '../env.js';

export async function handleOgImage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/og\/([A-Za-z0-9]{8})$/);
  if (!match) {
    return new Response('Not Found', { status: 404 });
  }

  const id = match[1];
  const obj = await env.BUCKET.get(`diagrams/${id}/og.png`);

  if (!obj) {
    return fallbackOgImage();
  }

  return new Response(obj.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

function fallbackOgImage(): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#1E2A3A"/>
    <text x="600" y="280" text-anchor="middle" fill="#E8EDF2" font-family="system-ui, sans-serif" font-size="64" font-weight="700">hansoom</text>
    <text x="600" y="350" text-anchor="middle" fill="#A8C4EC" font-family="system-ui, sans-serif" font-size="28">Breathe life into your diagrams</text>
    <text x="600" y="420" text-anchor="middle" fill="#0A7BC4" font-family="system-ui, sans-serif" font-size="22">hansoom.dev</text>
  </svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
