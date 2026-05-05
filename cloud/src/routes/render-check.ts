import type { Env } from '../env.js';
import { checkRateLimit } from '../rate-limit.js';

export async function handleRenderCheck(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const ipHash = await hashIp(ip);
  const key = `anon:${ipHash}`;

  const { allowed, remaining } = await checkRateLimit(env.DB, key, 'anon-render');

  return new Response(JSON.stringify({ allowed, remaining }), {
    status: allowed ? 200 : 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': String(remaining),
    },
  });
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
