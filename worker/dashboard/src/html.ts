// Dashboard HTML template — Sapphire Nightfall palette, Chart.js.
// All data is passed as a pre-serialised JSON string injected into the page.

import type { MetricsPayload } from './data';

// Sapphire Nightfall palette (mirrors src/themes/dark.ts tokens)
const COLORS = {
  bg: '#0F0F23',
  surface: '#1A1A3E',
  surfaceAlt: '#12122A',
  accent: '#0A7BC4',
  accentLight: 'rgba(10, 123, 196, 0.25)',
  accentMid: 'rgba(10, 123, 196, 0.55)',
  text: '#E8E8F0',
  textMuted: 'rgba(232, 232, 240, 0.55)',
  border: 'rgba(168, 168, 224, 0.15)',
  grid: 'rgba(168, 168, 224, 0.08)',
  dark: '#07071A',
  // Chart palette — distinct hues that read well on dark bg
  chartPalette: [
    '#0A7BC4', // sapphire
    '#34D399', // emerald
    '#F59E0B', // amber
    '#A78BFA', // violet
    '#F87171', // rose
    '#38BDF8', // sky
    '#FB923C', // orange
    '#4ADE80', // green
  ],
};

export function buildDashboardHtml(data: MetricsPayload): string {
  const json = JSON.stringify(data);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hansoom Metrics</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
          integrity="sha512-CQBWl4fJHWbryGE+Pc3UJWW1UoH0o81PgJMPi9hn/E/uGQJFuVxhGjcFRQHJ5L4ypWfmJ5oQQ0/4lYKSfaRg=="
          crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${COLORS.bg};
      color: ${COLORS.text};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
    }
    header {
      background: ${COLORS.dark};
      border-bottom: 1px solid ${COLORS.border};
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    header h1 { font-size: 16px; font-weight: 600; letter-spacing: 0.02em; }
    header .badge {
      background: ${COLORS.accentLight};
      color: ${COLORS.accent};
      border: 1px solid ${COLORS.accentMid};
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    header .ts {
      margin-left: auto;
      color: ${COLORS.textMuted};
      font-size: 12px;
    }
    main {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi {
      background: ${COLORS.surface};
      border: 1px solid ${COLORS.border};
      border-radius: 8px;
      padding: 16px;
    }
    .kpi .label { color: ${COLORS.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .kpi .value { font-size: 28px; font-weight: 700; color: ${COLORS.accent}; line-height: 1; }
    .kpi .sub { color: ${COLORS.textMuted}; font-size: 11px; margin-top: 4px; }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
      gap: 16px;
    }
    .chart-card {
      background: ${COLORS.surface};
      border: 1px solid ${COLORS.border};
      border-radius: 8px;
      padding: 20px;
    }
    .chart-card.wide { grid-column: 1 / -1; }
    .chart-card h2 {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${COLORS.textMuted};
      margin-bottom: 16px;
    }
    .chart-wrap { position: relative; height: 240px; }
    .chart-wrap.tall { height: 300px; }
    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: ${COLORS.textMuted};
      font-size: 13px;
    }
    footer {
      max-width: 1400px;
      margin: 24px auto 0;
      padding: 0 24px 24px;
      color: ${COLORS.textMuted};
      font-size: 11px;
    }
  </style>
</head>
<body>
<header>
  <h1>Hansoom / Metrics</h1>
  <span class="badge">Admin</span>
  <span class="ts" id="ts-label"></span>
</header>
<main>
  <div class="kpi-row" id="kpi-row"></div>
  <div class="charts-grid" id="charts-grid"></div>
</main>
<footer>
  Data cached daily. Sources: npm registry · GitHub · Cloudflare Analytics · D1 telemetry.
  No per-user data. <a href="/telemetry" style="color:${COLORS.accent}">Telemetry policy</a>.
</footer>
<script>
(function () {
  const RAW = ${json};

  // ── Chart.js global defaults ──────────────────────────────────────────────
  Chart.defaults.color = '${COLORS.textMuted}';
  Chart.defaults.borderColor = '${COLORS.grid}';
  Chart.defaults.font = { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", size: 11 };
  const PALETTE = ${JSON.stringify(COLORS.chartPalette)};

  // ── Timestamps ────────────────────────────────────────────────────────────
  document.getElementById('ts-label').textContent =
    'Last refreshed: ' + new Date(RAW.fetched_at).toLocaleString();

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const kpiRow = document.getElementById('kpi-row');
  function kpi(label, value, sub) {
    const el = document.createElement('div');
    el.className = 'kpi';
    el.innerHTML = \`<div class="label">\${label}</div><div class="value">\${value}</div><div class="sub">\${sub}</div>\`;
    kpiRow.appendChild(el);
  }
  const totalRenders = RAW.telemetry.total_renders;
  const last30Npm = RAW.npm.reduce(function(s, d) { return s + d.downloads; }, 0);
  kpi('Total Renders', totalRenders.toLocaleString(), 'all time (D1)');
  kpi('npm Installs', last30Npm.toLocaleString(), 'last 30 days');
  kpi('GitHub Stars', RAW.github.stars.toLocaleString(), 'current');
  kpi('GitHub Forks', RAW.github.forks.toLocaleString(), 'current');
  kpi('p50 Render', RAW.telemetry.render_time_p50 + ' ms', 'median');
  kpi('p95 Render', RAW.telemetry.render_time_p95 + ' ms', '95th pct');
  const watermarkTotal = RAW.cloudflare.watermark_clicks_by_day.reduce(function(s, d) { return s + d.count; }, 0);
  kpi('Watermark Clicks', watermarkTotal.toLocaleString(), 'last 30 days (UTM)');
  kpi('Themes', (function() {
    var t = RAW.telemetry.theme_split;
    if (!t.length) return '—';
    var dark = t.find(function(x) { return x.theme === 'dark'; });
    var light = t.find(function(x) { return x.theme === 'light'; });
    var d = dark ? dark.count : 0, l = light ? light.count : 0, tot = d + l || 1;
    return Math.round(d/tot*100) + '% dark';
  })(), 'dark vs light split');

  // ── Chart helpers ─────────────────────────────────────────────────────────
  const grid = document.getElementById('charts-grid');
  function card(title, wide) {
    var c = document.createElement('div');
    c.className = 'chart-card' + (wide ? ' wide' : '');
    c.innerHTML = \`<h2>\${title}</h2><div class="chart-wrap\${wide ? ' tall' : ''}"><canvas></canvas></div>\`;
    grid.appendChild(c);
    return c.querySelector('canvas');
  }
  function noData(canvas) {
    var wrap = canvas.parentElement;
    canvas.remove();
    wrap.innerHTML = '<div class="no-data">No data yet</div>';
  }
  function lineChart(canvas, labels, datasets, opts) {
    if (!labels.length) { noData(canvas); return; }
    new Chart(canvas, {
      type: 'line',
      data: { labels: labels, datasets: datasets.map(function(ds, i) {
        return Object.assign({ borderColor: PALETTE[i % PALETTE.length], backgroundColor: 'transparent', tension: 0.3, pointRadius: 2, borderWidth: 1.5 }, ds);
      })},
      options: Object.assign({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: datasets.length > 1 } }, scales: { x: { grid: { color: '${COLORS.grid}' }, ticks: { maxRotation: 45, maxTicksLimit: 10 } }, y: { grid: { color: '${COLORS.grid}' }, beginAtZero: true } } }, opts)
    });
  }
  function barChart(canvas, labels, data, opts) {
    if (!labels.length) { noData(canvas); return; }
    new Chart(canvas, {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: data, backgroundColor: PALETTE[0], borderRadius: 3, borderSkipped: false }] },
      options: Object.assign({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '${COLORS.grid}' } }, y: { grid: { color: '${COLORS.grid}' }, beginAtZero: true } } }, opts)
    });
  }
  function doughnutChart(canvas, labels, data) {
    if (!labels.length) { noData(canvas); return; }
    new Chart(canvas, {
      type: 'doughnut',
      data: { labels: labels, datasets: [{ data: data, backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
  }

  // ── Chart: daily active renders ───────────────────────────────────────────
  (function() {
    var c = card('Daily Active Renders (last 30 days)');
    var rows = RAW.telemetry.daily_renders_30d;
    lineChart(c, rows.map(function(r) { return r.day.slice(5); }), [{ label: 'renders', data: rows.map(function(r) { return r.count; }) }]);
  })();

  // ── Chart: npm installs ───────────────────────────────────────────────────
  (function() {
    var c = card('npm Installs (last 30 days)');
    var rows = RAW.npm;
    lineChart(c, rows.map(function(r) { return r.day.slice(5); }), [{ label: 'downloads', data: rows.map(function(r) { return r.downloads; }), borderColor: PALETTE[1] }]);
  })();

  // ── Chart: GitHub stars ───────────────────────────────────────────────────
  (function() {
    var c = card('GitHub Stars (weekly commits as proxy)');
    var rows = RAW.github.stargazers_weekly;
    lineChart(c, rows.map(function(r) { return new Date(r.week * 1000).toISOString().slice(5, 10); }), [{ label: 'commits/week', data: rows.map(function(r) { return r.total; }), borderColor: PALETTE[2] }]);
  })();

  // ── Chart: watermark CTR ──────────────────────────────────────────────────
  (function() {
    var c = card('Watermark Click-throughs (UTM, last 30 days)');
    var rows = RAW.cloudflare.watermark_clicks_by_day;
    lineChart(c, rows.map(function(r) { return r.day.slice(5); }), [{ label: 'clicks', data: rows.map(function(r) { return r.count; }), borderColor: PALETTE[3] }]);
  })();

  // ── Chart: complexity histogram ───────────────────────────────────────────
  (function() {
    var c = card('Diagram Complexity (node count distribution)');
    var rows = RAW.telemetry.complexity_histogram;
    barChart(c, rows.map(function(r) { return r.node_count + ' nodes'; }), rows.map(function(r) { return r.count; }));
  })();

  // ── Chart: theme split ────────────────────────────────────────────────────
  (function() {
    var c = card('Theme Split');
    var rows = RAW.telemetry.theme_split;
    doughnutChart(c, rows.map(function(r) { return r.theme; }), rows.map(function(r) { return r.count; }));
  })();

  // ── Chart: render time p50/p95 ────────────────────────────────────────────
  (function() {
    var c = card('Render Time (p50 / p95)');
    var p50 = RAW.telemetry.render_time_p50, p95 = RAW.telemetry.render_time_p95;
    if (!p50 && !p95) { noData(c); return; }
    new Chart(c, {
      type: 'bar',
      data: {
        labels: ['p50 (median)', 'p95'],
        datasets: [{ data: [p50, p95], backgroundColor: [PALETTE[0], PALETTE[4]], borderRadius: 3, borderSkipped: false }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '${COLORS.grid}' } }, y: { grid: { color: '${COLORS.grid}' }, beginAtZero: true, title: { display: true, text: 'ms' } } } }
    });
  })();

  // ── Chart: version adoption ───────────────────────────────────────────────
  (function() {
    var c = card('Version Adoption %');
    var rows = RAW.telemetry.version_adoption;
    barChart(c, rows.map(function(r) { return 'v' + r.version; }), rows.map(function(r) { return r.pct; }), { scales: { y: { max: 100, title: { display: true, text: '%' } } } });
  })();

  // ── Chart: OS distribution ────────────────────────────────────────────────
  (function() {
    var c = card('OS Distribution');
    var rows = RAW.telemetry.os_distribution;
    doughnutChart(c, rows.map(function(r) { return r.os; }), rows.map(function(r) { return r.count; }));
  })();

  // ── Chart: top referrers ──────────────────────────────────────────────────
  (function() {
    var c = card('Top Referrers to hansoom.dev', true);
    var rows = RAW.cloudflare.top_referrers;
    barChart(c, rows.map(function(r) { return r.referrer || '(direct)'; }), rows.map(function(r) { return r.count; }), {});
  })();
})();
</script>
</body>
</html>`;
}
