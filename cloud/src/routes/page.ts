import type { Env } from '../env.js';

export async function handlePage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/p\/([A-Za-z0-9]{8})$/);
  if (!match) {
    return new Response('Not Found', { status: 404 });
  }

  const id = match[1];

  const [htmlObj, meta] = await Promise.all([
    env.BUCKET.get(`diagrams/${id}/output.html`),
    env.DB.prepare('SELECT * FROM diagrams WHERE id = ?').bind(id).first(),
  ]);

  if (!htmlObj || !meta) {
    return new Response('Not Found', { status: 404 });
  }

  // Increment view count (fire-and-forget)
  env.DB.prepare('UPDATE diagrams SET view_count = view_count + 1 WHERE id = ?')
    .bind(id)
    .run()
    .catch(() => {});

  const html = await htmlObj.text();
  const ogImageUrl = `${url.origin}/api/og/${id}`;
  const title = (meta.title as string) || 'Hansoom Diagram';
  const description = `Animated Mermaid diagram — created with hansoom.dev`;

  const wrappedHtml = injectPageWrapper(html, {
    id,
    title,
    description,
    ogImageUrl,
    origin: url.origin,
  });

  return new Response(wrappedHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

interface PageMeta {
  id: string;
  title: string;
  description: string;
  ogImageUrl: string;
  origin: string;
}

function injectPageWrapper(html: string, meta: PageMeta): string {
  const ogTags = `
    <meta property="og:title" content="${escapeAttr(meta.title)}">
    <meta property="og:description" content="${escapeAttr(meta.description)}">
    <meta property="og:image" content="${meta.ogImageUrl}">
    <meta property="og:url" content="${meta.origin}/p/${meta.id}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(meta.title)}">
    <meta name="twitter:description" content="${escapeAttr(meta.description)}">
    <meta name="twitter:image" content="${meta.ogImageUrl}">`;

  const ctaFooter = `
  <div class="soom-cloud-footer" style="
    position: fixed; bottom: 0; left: 0; right: 0;
    display: flex; align-items: center; justify-content: center;
    padding: 10px 16px; gap: 8px;
    background: rgba(16, 24, 36, 0.95);
    backdrop-filter: blur(8px);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px; color: #A8C4EC;
    z-index: 50;
  ">
    <span>Made with</span>
    <a href="${meta.origin}/?utm_source=shared_diagram&utm_medium=cta&utm_campaign=cloud"
       style="color: #0A7BC4; text-decoration: none; font-weight: 600;"
       target="_blank" rel="noopener">hansoom</a>
    <span style="opacity: 0.4;">·</span>
    <a href="${meta.origin}/play?utm_source=shared_diagram&utm_medium=cta&utm_campaign=cloud"
       style="color: #0A7BC4; text-decoration: none; font-weight: 600;"
       target="_blank" rel="noopener">Make your own</a>
    <button onclick="document.querySelector('.soom-source-drawer').classList.toggle('soom-source-open')"
      style="margin-left: auto; background: transparent; border: 1px solid #3D5A6E;
             color: #A8C4EC; padding: 4px 12px; border-radius: 4px; cursor: pointer;
             font-size: 12px;">
      View Source
    </button>
  </div>
  <div class="soom-source-drawer" style="
    position: fixed; bottom: 42px; left: 0; right: 0;
    max-height: 0; overflow: hidden; transition: max-height 300ms ease;
    background: rgba(16, 24, 36, 0.98); backdrop-filter: blur(8px);
    z-index: 49;
  ">
    <pre id="soom-source-code" style="
      margin: 0; padding: 16px 24px; font-size: 13px; line-height: 1.5;
      color: #E8EDF2; font-family: 'SF Mono', 'Fira Code', monospace;
      white-space: pre-wrap; overflow-y: auto; max-height: 40vh;
    "></pre>
  </div>
  <style>
    .soom-source-drawer.soom-source-open { max-height: 45vh; }
    .soom-cloud-footer ~ .soom-controls { bottom: 42px; }
    body { padding-bottom: calc(2rem + 106px) !important; }
  </style>
  <script>
    fetch('/api/source/${meta.id}').then(r => r.ok ? r.text() : '').then(src => {
      const el = document.getElementById('soom-source-code');
      if (el && src) el.textContent = src;
    });
  </script>`;

  // Inject OG tags into <head>
  let result = html.replace('</head>', `${ogTags}\n</head>`);
  // Inject CTA + source drawer before </body>
  result = result.replace('</body>', `${ctaFooter}\n</body>`);

  return result;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
