// Data fetchers for the four analytics sources.
// All fetchers return plain objects — no PII, no raw events, aggregates only.

export interface NpmDownloadDay {
  day: string;
  downloads: number;
}

export interface GitHubStats {
  stars: number;
  forks: number;
  watchers: number;
  clones_14d: { day: string; count: number }[];
  views_14d: { day: string; count: number }[];
  referrers: { referrer: string; count: number }[];
  stargazers_weekly: { week: number; total: number }[];
}

export interface CFAnalyticsData {
  watermark_clicks_by_day: { day: string; count: number }[];
  top_referrers: { referrer: string; count: number }[];
}

export interface TelemetryAggregates {
  daily_renders_30d: { day: string; count: number }[];
  complexity_histogram: { node_count: number; count: number }[];
  theme_split: { theme: string; count: number }[];
  render_time_p50: number;
  render_time_p95: number;
  version_adoption: { version: string; count: number; pct: number }[];
  os_distribution: { os: string; count: number; pct: number }[];
  total_renders: number;
}

export interface MetricsPayload {
  fetched_at: string;
  npm: NpmDownloadDay[];
  github: GitHubStats;
  cloudflare: CFAnalyticsData;
  telemetry: TelemetryAggregates;
}

// ── npm registry ──────────────────────────────────────────────────────────────

export async function fetchNpmDownloads(pkg: string): Promise<NpmDownloadDay[]> {
  const res = await fetch(`https://api.npmjs.org/downloads/range/last-30-days/${pkg}`, {
    headers: { 'User-Agent': 'soom-dashboard/1.0' },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { downloads?: { day: string; downloads: number }[] };
  return (json.downloads ?? []).map((d) => ({ day: d.day, downloads: d.downloads }));
}

// ── GitHub ────────────────────────────────────────────────────────────────────

export async function fetchGitHubStats(repo: string, token: string): Promise<GitHubStats> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'soom-dashboard/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  async function ghGet<T>(path: string): Promise<T | null> {
    const r = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers });
    if (!r.ok) return null;
    return r.json() as Promise<T>;
  }

  const [
    repoData,
    clonesData,
    viewsData,
    referrersData,
    stargazersData,
  ] = await Promise.all([
    ghGet<{ stargazers_count: number; forks_count: number; subscribers_count: number }>(''),
    ghGet<{ clones: { timestamp: string; count: number }[] }>('/traffic/clones'),
    ghGet<{ views: { timestamp: string; count: number }[] }>('/traffic/views'),
    ghGet<{ referrer: string; count: number }[]>('/traffic/referrers'),
    ghGet<{ week: number; total: number }[]>('/stats/commit_activity'),
  ]);

  return {
    stars: repoData?.stargazers_count ?? 0,
    forks: repoData?.forks_count ?? 0,
    watchers: repoData?.subscribers_count ?? 0,
    clones_14d: (clonesData?.clones ?? []).map((c) => ({
      day: c.timestamp.slice(0, 10),
      count: c.count,
    })),
    views_14d: (viewsData?.views ?? []).map((v) => ({
      day: v.timestamp.slice(0, 10),
      count: v.count,
    })),
    referrers: (referrersData ?? []).slice(0, 10),
    stargazers_weekly: (stargazersData ?? []).slice(-12).map((w) => ({
      week: w.week,
      total: w.total,
    })),
  };
}

// ── Cloudflare Analytics (GraphQL) ────────────────────────────────────────────

const CF_GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';

export async function fetchCFAnalytics(
  zoneId: string,
  apiToken: string,
): Promise<CFAnalyticsData> {
  if (!zoneId || !apiToken) return { watermark_clicks_by_day: [], top_referrers: [] };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);

  const query = `{
    viewer {
      zones(filter: { zoneTag: "${zoneId}" }) {
        httpRequestsAdaptiveGroups(
          filter: {
            AND: [
              { date_geq: "${since}" },
              { date_leq: "${until}" },
              { clientRequestQuery_contains: "utm_source=soom-output" }
            ]
          }
          orderBy: [date_ASC]
          limit: 31
        ) {
          count
          dimensions { date }
        }
        topReferrers: httpRequestsAdaptiveGroups(
          filter: {
            AND: [
              { date_geq: "${since}" },
              { date_leq: "${until}" }
            ]
          }
          orderBy: [count_DESC]
          limit: 10
        ) {
          count
          dimensions { refererHost }
        }
      }
    }
  }`;

  const res = await fetch(CF_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) return { watermark_clicks_by_day: [], top_referrers: [] };

  const json = (await res.json()) as {
    data?: {
      viewer?: {
        zones?: {
          httpRequestsAdaptiveGroups?: { count: number; dimensions: { date: string } }[];
          topReferrers?: { count: number; dimensions: { refererHost: string } }[];
        }[];
      };
    };
  };

  const zone = json.data?.viewer?.zones?.[0];
  return {
    watermark_clicks_by_day: (zone?.httpRequestsAdaptiveGroups ?? []).map((g) => ({
      day: g.dimensions.date,
      count: g.count,
    })),
    top_referrers: (zone?.topReferrers ?? [])
      .filter((g) => g.dimensions.refererHost)
      .map((g) => ({ referrer: g.dimensions.refererHost, count: g.count })),
  };
}

// ── D1 telemetry aggregates ───────────────────────────────────────────────────

export async function fetchTelemetryAggregates(db: D1Database): Promise<TelemetryAggregates> {
  const [
    dailyResult,
    complexityResult,
    themeResult,
    totalResult,
    versionResult,
    osResult,
    p50Result,
    p95Result,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT DATE(ts) AS day, COUNT(*) AS count
         FROM renders
         WHERE ts >= DATE('now', '-30 days')
         GROUP BY day
         ORDER BY day ASC`,
      )
      .all<{ day: string; count: number }>(),

    db
      .prepare(
        `SELECT node_count, COUNT(*) AS count
         FROM renders
         GROUP BY node_count
         ORDER BY node_count ASC`,
      )
      .all<{ node_count: number; count: number }>(),

    db
      .prepare(
        `SELECT theme, COUNT(*) AS count
         FROM renders
         GROUP BY theme
         ORDER BY count DESC`,
      )
      .all<{ theme: string; count: number }>(),

    db.prepare(`SELECT COUNT(*) AS total FROM renders`).first<{ total: number }>(),

    db
      .prepare(
        `SELECT version, COUNT(*) AS count
         FROM renders
         GROUP BY version
         ORDER BY count DESC`,
      )
      .all<{ version: string; count: number }>(),

    db
      .prepare(
        `SELECT os, COUNT(*) AS count
         FROM renders
         GROUP BY os
         ORDER BY count DESC`,
      )
      .all<{ os: string; count: number }>(),

    // p50: row at 50th percentile index
    db
      .prepare(
        `SELECT render_time_ms FROM renders
         ORDER BY render_time_ms ASC
         LIMIT 1 OFFSET MAX(0, CAST((SELECT COUNT(*) * 0.50 AS REAL FROM renders) AS INT) - 1)`,
      )
      .first<{ render_time_ms: number }>(),

    // p95: row at 95th percentile index
    db
      .prepare(
        `SELECT render_time_ms FROM renders
         ORDER BY render_time_ms ASC
         LIMIT 1 OFFSET MAX(0, CAST((SELECT COUNT(*) * 0.95 AS REAL FROM renders) AS INT) - 1)`,
      )
      .first<{ render_time_ms: number }>(),
  ]);

  const total = totalResult?.total ?? 0;

  const versionAdoption = (versionResult.results ?? []).map((r) => ({
    version: r.version,
    count: r.count,
    pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
  }));

  const osDistribution = (osResult.results ?? []).map((r) => ({
    os: r.os,
    count: r.count,
    pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
  }));

  return {
    daily_renders_30d: dailyResult.results ?? [],
    complexity_histogram: complexityResult.results ?? [],
    theme_split: themeResult.results ?? [],
    render_time_p50: p50Result?.render_time_ms ?? 0,
    render_time_p95: p95Result?.render_time_ms ?? 0,
    version_adoption: versionAdoption,
    os_distribution: osDistribution,
    total_renders: total,
  };
}
