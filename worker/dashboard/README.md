# soom-dashboard — Cloudflare Worker

Analytics dashboard at `hansoom.dev/admin/metrics`. Aggregates data from four
sources: npm registry, GitHub API, Cloudflare Analytics, and the D1 telemetry
database. Protected by Cloudflare Access (Zero Trust free tier).

## Architecture

- **One Worker**, two routes:
  - `GET /admin/metrics` — dashboard HTML with Chart.js (Sapphire Nightfall palette)
  - `GET /admin/metrics/api` — JSON metrics payload
- **Data refreshes daily.** The Worker caches the aggregated payload in KV for 24
  hours. No manual refresh is needed; the first request after cache expiry fetches
  fresh data from all four sources.
- **No PII.** All data is aggregated before serving. D1 queries use `GROUP BY`;
  the npm and GitHub APIs return only counts; the Cloudflare Analytics API
  returns only page-view counts.

## Deploy

Prerequisites: Cloudflare account (free tier), `wrangler` CLI installed,
D1 database already created by `worker/` (the telemetry receiver).

### 1. Get the D1 database ID

```bash
wrangler d1 list
```

Copy the `database_id` for `soom-telemetry` into `wrangler.toml`.

### 2. Create the KV namespace

```bash
wrangler kv:namespace create soom-dashboard-cache
```

Copy the printed `id` into `wrangler.toml` under `[[kv_namespaces]]`.

### 3. Set secrets

```bash
# Fine-grained PAT — needs contents:read + metadata:read on soom-dev/soom
wrangler secret put GITHUB_TOKEN

# Cloudflare API token — Zone Analytics:Read for hansoom.dev
wrangler secret put CF_API_TOKEN

# Cloudflare zone ID for hansoom.dev (Dashboard → hansoom.dev → Overview → Zone ID)
wrangler secret put CF_ZONE_ID
```

### 4. Deploy

```bash
cd worker/dashboard
wrangler deploy
```

Cloudflare assigns a `*.workers.dev` URL. The next step binds it to `hansoom.dev`.

### 5. Add a route

Cloudflare Dashboard → Workers & Pages → the `soom-dashboard` Worker →
Settings → Triggers → Routes → Add route:

```
hansoom.dev/admin/*
```

Zone: `hansoom.dev`.

### 6. Configure Cloudflare Access

Zero Trust Dashboard (<https://one.dash.cloudflare.com>) → Access →
Applications → Add an application:

| Field | Value |
|---|---|
| Application type | Self-hosted |
| Application name | Hansoom Admin |
| Application domain | `hansoom.dev` |
| Path | `/admin` |
| Session duration | 24 hours |

Add a policy:
- **Policy name:** Maintainers
- **Action:** Allow
- **Rule type:** Emails → add maintainer email(s)

With Access in place, any unauthenticated request to `hansoom.dev/admin/*`
receives a Cloudflare-hosted login page (one-time PIN to email). No auth code
lives in the Worker.

## Free-tier scope

| Resource | Free limit | Dashboard usage |
|---|---|---|
| Workers requests | 100k/day | <50 admin page views/day |
| D1 reads | 5M/day | 8 queries per data refresh |
| KV reads | 100k/day | 1 read per page view |
| KV writes | 1k/day | 1 write per 24h cache refresh |
| Cloudflare Access | 50 users | maintainer team |

All well within free tier. No paid bindings used.

## Adding a new chart

1. Add a field to `MetricsPayload` in `src/data.ts`.
2. Add the fetcher logic in the appropriate `fetch*` function.
3. Add the chart in `buildDashboardHtml` in `src/html.ts`.
4. Deploy.
