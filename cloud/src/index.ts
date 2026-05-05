import type { Env } from './env.js';
import { handleSave } from './routes/save.js';
import { handlePage } from './routes/page.js';
import { handleOgImage } from './routes/og.js';
import { handleAuthGithub, handleAuthCallback, handleAuthMe } from './routes/auth.js';
import { handleRenderCheck } from './routes/render-check.js';
import { handleSource } from './routes/source.js';
import { cleanupExpiredRateLimits } from './rate-limit.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': url.origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let response: Response;

      if (path === '/api/save' && request.method === 'POST') {
        response = await handleSave(request, env);
      } else if (path === '/api/render-check' && request.method === 'POST') {
        response = await handleRenderCheck(request, env);
      } else if (path.startsWith('/p/')) {
        response = await handlePage(request, env);
      } else if (path.startsWith('/api/og/')) {
        response = await handleOgImage(request, env);
      } else if (path === '/auth/github') {
        response = await handleAuthGithub(request, env);
      } else if (path === '/auth/github/callback') {
        response = await handleAuthCallback(request, env);
      } else if (path === '/auth/me') {
        response = await handleAuthMe(request, env);
      } else if (path.startsWith('/api/source/')) {
        response = await handleSource(request, env);
      } else {
        // Static assets handled by [assets] binding — if we reach here, 404.
        return new Response('Not Found', { status: 404 });
      }

      for (const [k, v] of Object.entries(corsHeaders)) {
        response.headers.set(k, v);
      }
      return response;
    } catch (err) {
      console.error('Unhandled error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await cleanupExpiredRateLimits(env.DB);
  },
};
