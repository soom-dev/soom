// Analytics dashboard Worker — serves hansoom.dev/admin/metrics.
//
// Routes:
//   GET /admin/metrics        → dashboard HTML (protected by Cloudflare Access)
//   GET /admin/metrics/api    → JSON metrics payload (KV-cached 24h)
//
// Required secrets (set via `wrangler secret put`):
//   GITHUB_TOKEN    — fine-grained PAT with contents:read + metadata:read
//   CF_API_TOKEN    — Cloudflare zone-analytics:read token for hansoom.dev
//   CF_ZONE_ID      — Cloudflare zone ID for hansoom.dev
//
// Required bindings (configured in wrangler.toml):
//   DB    — D1 database binding (same soom-telemetry database)
//   CACHE — KV namespace for the 24-hour data cache

import { fetchNpmDownloads, fetchGitHubStats, fetchCFAnalytics, fetchTelemetryAggregates } from './data';
import type { MetricsPayload } from './data';
import { buildDashboardHtml } from './html';

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  GITHUB_TOKEN: string;
  CF_API_TOKEN: string;
  CF_ZONE_ID: string;
  GITHUB_REPO: string;
  NPM_PACKAGE: string;
}

const CACHE_KEY = 'metrics:v1';
const CACHE_TTL_S = 24 * 60 * 60; // 24 hours

async function fetchMetrics(env: Env): Promise<MetricsPayload> {
  const [npm, github, cloudflare, telemetry] = await Promise.all([
    fetchNpmDownloads(env.NPM_PACKAGE),
    fetchGitHubStats(env.GITHUB_REPO, env.GITHUB_TOKEN),
    fetchCFAnalytics(env.CF_ZONE_ID, env.CF_API_TOKEN),
    fetchTelemetryAggregates(env.DB),
  ]);
  return { fetched_at: new Date().toISOString(), npm, github, cloudflare, telemetry };
}

async function getCachedOrFetch(env: Env): Promise<MetricsPayload> {
  const cached = await env.CACHE.get(CACHE_KEY, 'json') as MetricsPayload | null;
  if (cached) return cached;
  const fresh = await fetchMetrics(env);
  // Fire-and-forget KV write; don't block the response
  env.CACHE.put(CACHE_KEY, JSON.stringify(fresh), { expirationTtl: CACHE_TTL_S });
  return fresh;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);

    if (url.pathname === '/admin/metrics/api') {
      const data = await getCachedOrFetch(env);
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    if (url.pathname === '/admin/metrics' || url.pathname === '/admin/metrics/') {
      const data = await getCachedOrFetch(env);
      const html = buildDashboardHtml(data);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, no-store',
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
