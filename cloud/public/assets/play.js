// Hansoom Cloud — /play client-side rendering pipeline.
// Runs the same Mermaid → SVG → graph → sequence → scene → animation pipeline
// as the CLI, but entirely in the user's browser. No server-side rendering.

const TIMING = {
  idleGap: 500,
  interStepGap: 399,
  endHold: 1000,
  loopDelay: 3000,
};

const RENDER_TIMEOUT_MS = 15_000;

// ─── Pipeline: postProcessSvg ──────────────────────────────────
function postProcessSvg(svg, mermaidSource) {
  let result = svg;
  result = result.replace(
    /(<g[^>]*class="[^"]*\bnode\b[^"]*"[^>]*id=")([^"]*flowchart-)([^"]*?)(-\d+)(")/g,
    '$1$2$3$4$5 data-node-id="$3"'
  );
  if (mermaidSource) {
    const depthMap = parseSubgraphDepths(mermaidSource);
    for (const [name, depth] of depthMap) {
      const clusterRe = new RegExp(
        `(<g[^>]*class="[^"]*\\bcluster\\b[^"]*"[^>]*id="[^"]*-${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`,
        'g'
      );
      result = result.replace(clusterRe, `$1 data-depth="${depth}"`);
    }
  }
  return result;
}

function parseSubgraphDepths(source) {
  const depths = new Map();
  let currentDepth = 0;
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    const match = trimmed.match(/^subgraph\s+(\S+)/i);
    if (match) {
      depths.set(match[1].replace(/\[.*/, '').replace(/["']/g, ''), currentDepth);
      currentDepth++;
      continue;
    }
    if (/^\s*end\s*$/i.test(trimmed)) currentDepth = Math.max(0, currentDepth - 1);
  }
  return depths;
}

// ─── Pipeline: buildGraphFromSvg ───────────────────────────────
function parseEdgeId(rawId, knownNodeIds) {
  const lIdx = rawId.search(/L[-_]/);
  if (lIdx < 0) return null;
  const body = rawId.slice(lIdx + 1);
  if (body.length < 2) return null;
  const delim = body[0];
  const rest = body.slice(1);
  for (const src of knownNodeIds) {
    if (!rest.startsWith(src)) continue;
    const afterSrc = rest.slice(src.length);
    if (afterSrc.length < 2 || afterSrc[0] !== delim) continue;
    const remaining = afterSrc.slice(1);
    for (const tgt of knownNodeIds) {
      if (!remaining.startsWith(tgt)) continue;
      const afterTgt = remaining.slice(tgt.length);
      if (afterTgt.length >= 2 && afterTgt[0] === delim && /^\d+$/.test(afterTgt.slice(1))) {
        return { source: src, target: tgt };
      }
    }
  }
  return null;
}

function buildGraphFromSvg(svg, mermaidSource) {
  const nodes = new Map();
  const edges = [];
  const nodeRe = /id="[^"]*flowchart-([^"]*?)-\d+"/g;
  const seenNodes = new Set();
  let m;
  while ((m = nodeRe.exec(svg)) !== null) {
    const nodeId = m[1];
    if (!seenNodes.has(nodeId)) {
      seenNodes.add(nodeId);
      nodes.set(nodeId, { id: nodeId, label: nodeId, type: 'default', position: { x: 0, y: 0, width: 0, height: 0 } });
    }
  }
  const labelRe = /id="[^"]*flowchart-([^"]*?)-\d+"[\s\S]*?class="nodeLabel[^"]*">([^<]+)</g;
  while ((m = labelRe.exec(svg)) !== null) {
    if (nodes.has(m[1])) nodes.get(m[1]).label = m[2].trim();
  }
  const edgeLabelGroupRe = /data-id="([^"]*L[-_].+?[-_]\d+)"[^>]*>[\s\S]*?<foreignObject[^>]*>([\s\S]*?)<\/foreignObject>/g;
  const edgeLabelMap = new Map();
  const knownForLabels = Array.from(seenNodes);
  while ((m = edgeLabelGroupRe.exec(svg)) !== null) {
    const parsed = parseEdgeId(m[1], knownForLabels);
    if (!parsed) continue;
    const labelText = m[2].replace(/<[^>]*>/g, '').trim();
    if (labelText) edgeLabelMap.set(`${parsed.source}-${parsed.target}`, labelText);
  }
  const edgeIdRe = /id="([^"]*L[-_].+?[-_]\d+)"/g;
  let edgeIndex = 0;
  const seenEdges = new Set();
  const knownNodeIds = Array.from(seenNodes);
  while ((m = edgeIdRe.exec(svg)) !== null) {
    const parsed = parseEdgeId(m[1], knownNodeIds);
    if (!parsed) continue;
    const key = `${parsed.source}-${parsed.target}`;
    if (!seenEdges.has(key)) {
      seenEdges.add(key);
      edges.push({
        id: `edge-${edgeIndex}`,
        source: parsed.source,
        target: parsed.target,
        label: edgeLabelMap.get(key),
        path: '',
        style: 'solid',
      });
      edgeIndex++;
    }
  }
  if (mermaidSource) {
    const mmdLabelRe = /(\w+)\[(?:"([^"]+)"|([^\]]+))\]/g;
    let mm;
    while ((mm = mmdLabelRe.exec(mermaidSource)) !== null) {
      const rawLabel = mm[2] || mm[3];
      if (rawLabel && nodes.has(mm[1])) {
        nodes.get(mm[1]).label = rawLabel.replace(/<br\s*\/?>/gi, '\n').trim();
      }
    }
  }
  return { nodes, edges, subgraphs: [], metadata: { sourceFormat: 'mermaid', sourceText: mermaidSource || '' } };
}

// ─── Pipeline: autoSequence ────────────────────────────────────
function autoSequence(graph, defaultDuration = 800) {
  const adj = new Map();
  const inDegree = new Map();
  for (const [id] of graph.nodes) { adj.set(id, []); inDegree.set(id, 0); }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push({ target: edge.target, edgeId: edge.id });
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }
  const remaining = new Map(inDegree);
  const visited = new Set();
  const steps = [];
  let stepIndex = 0;
  let queue = [];
  for (const [id, deg] of remaining) { if (deg === 0) queue.push(id); }
  while (visited.size < graph.nodes.size) {
    if (queue.length === 0) {
      let bestId = null, bestDeg = Infinity;
      for (const [id] of graph.nodes) {
        if (visited.has(id)) continue;
        const deg = remaining.get(id) ?? Infinity;
        if (deg < bestDeg) { bestDeg = deg; bestId = id; }
      }
      if (bestId === null) break;
      queue.push(bestId);
    }
    const nextQueue = [];
    const activateNodes = [];
    const activateEdges = [];
    for (const nodeId of queue) {
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      activateNodes.push(nodeId);
      for (const { target, edgeId } of adj.get(nodeId) ?? []) {
        activateEdges.push(edgeId);
        const newDeg = (remaining.get(target) ?? 1) - 1;
        remaining.set(target, newDeg);
        if (newDeg <= 0 && !visited.has(target)) nextQueue.push(target);
      }
    }
    if (activateNodes.length > 0) {
      steps.push({ id: `step-${stepIndex}`, activateNodes, activateEdges, duration: defaultDuration, parallel: activateNodes.length > 1 });
      stepIndex++;
    }
    queue = nextQueue;
  }
  return { steps, defaultDuration, title: graph.metadata.title };
}

// ─── Pipeline: measureEdgePaths (browser-native) ───────────────
function measureEdgePaths(container) {
  const map = new Map();
  const paths = container.querySelectorAll('g.edgePaths path[id]');
  paths.forEach((p, idx) => {
    try { map.set(`edge-${idx}`, p.getTotalLength()); }
    catch { map.set(`edge-${idx}`, 0); }
  });
  return map;
}

// ─── Pipeline: buildScene ──────────────────────────────────────
function computeDrawDuration(pathLen) {
  if (pathLen < 150) return 700;
  return Math.max(400, Math.min(Math.round(pathLen * 3), 1200));
}

function computeEasing(pathLen) {
  return pathLen < 150 ? 'spring(1,80,10,0)' : 'inOutQuad';
}

function extractNodeSvgIds(svg, knownNodeIds) {
  const out = new Map();
  const re = /id="([^"]*flowchart-([^"]*?)-\d+)"/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (!out.has(m[2])) out.set(m[2], m[1]);
  }
  return out;
}

function extractEdgeSvgIds(svg, knownNodeIds) {
  const out = new Map();
  const re = /id="([^"]*L[-_].+?[-_]\d+)"/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const parsed = parseEdgeId(m[1], knownNodeIds);
    if (!parsed) continue;
    const key = `${parsed.source} ${parsed.target}`;
    if (!out.has(key)) out.set(key, m[1]);
  }
  return out;
}

function extractEdgeLabelSvgIds(svg, knownNodeIds) {
  const out = new Map();
  const re = /data-id="([^"]*L[-_].+?[-_]\d+)"/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const parsed = parseEdgeId(m[1], knownNodeIds);
    if (!parsed) continue;
    const key = `${parsed.source} ${parsed.target}`;
    if (!out.has(key)) out.set(key, m[1]);
  }
  return out;
}

function buildScene(graph, sequence, measurements, svg) {
  const knownNodeIds = Array.from(graph.nodes.keys());
  const nodeSvgIds = extractNodeSvgIds(svg, knownNodeIds);
  const edgeSvgIds = extractEdgeSvgIds(svg, knownNodeIds);
  const edgeLabelSvgIds = extractEdgeLabelSvgIds(svg, knownNodeIds);
  const nodes = {};
  for (const [id, node] of graph.nodes) {
    nodes[id] = { svgId: nodeSvgIds.get(id) ?? id, label: node.label };
  }
  const edges = {};
  for (const edge of graph.edges) {
    const len = measurements.get(edge.id) ?? 300;
    const sceneEdge = {
      svgId: edgeSvgIds.get(`${edge.source} ${edge.target}`) ?? edge.id,
      source: edge.source,
      target: edge.target,
      drawDuration: computeDrawDuration(len),
      easing: computeEasing(len),
    };
    if (edge.label) sceneEdge.label = edge.label;
    const labelSvgId = edgeLabelSvgIds.get(`${edge.source} ${edge.target}`);
    if (labelSvgId) sceneEdge.labelSvgId = labelSvgId;
    edges[edge.id] = sceneEdge;
  }
  const steps = sequence.steps.map((step) => ({
    id: step.id,
    activate: { nodes: step.activateNodes, edges: step.activateEdges },
    parallel: step.parallel,
  }));
  return {
    version: 1,
    diagramType: 'flowchart',
    elements: { nodes, edges },
    steps,
    timing: { idleGap: TIMING.idleGap, endHold: TIMING.endHold, interStepGap: TIMING.interStepGap, loopDelay: TIMING.loopDelay },
  };
}

// ─── Controls HTML ─────────────────────────────────────────────
function getControlsHtml() {
  return `
  <div class="soom-controls" id="soom-controls" role="toolbar" aria-label="Playback controls">
    <button class="soom-ctrl-btn" id="soom-step-back" aria-label="Step back" title="Step back">⏮</button>
    <button class="soom-ctrl-btn" id="soom-play-pause" aria-label="Play" title="Play/Pause">▶</button>
    <button class="soom-ctrl-btn" id="soom-step-fwd" aria-label="Step forward" title="Step forward">⏭</button>
    <input id="soom-scrubber" type="range" min="0" max="0" value="0" step="1" aria-label="Timeline scrubber">
    <span id="soom-step-counter">—</span>
    <button class="soom-ctrl-btn" id="soom-speed" aria-label="Playback speed" title="Cycle speed">1×</button>
    <button class="soom-ctrl-btn" id="soom-loop" aria-label="Loop toggle" title="Toggle loop" aria-pressed="false">🔁</button>
    <button class="soom-ctrl-btn" id="soom-help" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">?</button>
  </div>
  <div class="soom-help-modal" id="soom-help-modal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="soom-help-modal-card">
      <h2 class="soom-help-modal-title">Keyboard shortcuts</h2>
      <dl class="soom-help-modal-list">
        <dt><kbd>Space</kbd></dt><dd>Play / pause</dd>
        <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Step backward / forward</dd>
        <dt><kbd>?</kbd></dt><dd>Show this help</dd>
        <dt><kbd>Esc</kbd></dt><dd>Close help</dd>
      </dl>
      <button class="soom-ctrl-btn soom-help-modal-close" id="soom-help-close" aria-label="Close help">✖</button>
    </div>
  </div>
  <div id="soom-annotations" aria-live="polite" aria-atomic="true"></div>
  <div id="soom-progress-pin" aria-hidden="true"><div id="soom-progress-pin-fill"></div></div>`;
}

// ─── Mermaid Rendering ─────────────────────────────────────────
let mermaidReady = false;
let renderCount = 0;

function initMermaid() {
  if (!window.mermaid) return false;
  window.mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    flowchart: { diagramPadding: 20 },
  });
  mermaidReady = true;
  return true;
}

async function renderMermaidSvg(source) {
  if (!mermaidReady && !initMermaid()) {
    throw new Error('Mermaid library not loaded. Please refresh the page.');
  }
  const id = `soom-render-${++renderCount}`;
  const { svg } = await window.mermaid.render(id, source);
  return svg;
}

// ─── Full Pipeline ─────────────────────────────────────────────
async function runPipeline(source, container) {
  const rawSvg = await renderMermaidSvg(source);
  const svg = postProcessSvg(rawSvg, source);

  container.innerHTML = svg;

  // Fix foreignObject widths (same as src/render/playwright.ts)
  const svgEl = container.querySelector('svg');
  if (svgEl) {
    fixForeignObjectWidths(svgEl);
  }

  const fixedSvg = svgEl ? svgEl.outerHTML : svg;
  const graph = buildGraphFromSvg(fixedSvg, source);
  const sequence = autoSequence(graph);
  const measurements = measureEdgePaths(container);
  const scene = buildScene(graph, sequence, measurements, fixedSvg);

  return { svg: fixedSvg, scene };
}

function fixForeignObjectWidths(svgEl) {
  const svgDOMRect = svgEl.getBoundingClientRect();
  const viewBox = svgEl.viewBox.baseVal;
  const vbWidth = viewBox.width || parseFloat(svgEl.getAttribute('width') || '0') || svgDOMRect.width;
  if (svgDOMRect.width === 0 || vbWidth === 0) return;
  const pxToSvg = vbWidth / svgDOMRect.width;

  svgEl.querySelectorAll('.node').forEach((nodeEl) => {
    const rectEl = nodeEl.querySelector('rect.basic, rect.label-container');
    const foEl = nodeEl.querySelector('foreignObject');
    if (!foEl) return;
    let shapeWidth = 0;
    if (rectEl) {
      shapeWidth = parseFloat(rectEl.getAttribute('width') ?? '0');
    } else {
      const shapeEl = nodeEl.querySelector('polygon, circle, ellipse, path');
      if (shapeEl) { try { shapeWidth = shapeEl.getBBox().width; } catch {} }
    }
    if (rectEl) {
      const origFoWidth = foEl.getAttribute('width') ?? '';
      foEl.setAttribute('width', '3000');
      const labelEl = foEl.querySelector('.nodeLabel, p, span, div');
      if (labelEl) { labelEl.style.whiteSpace = 'nowrap'; labelEl.style.maxWidth = 'none'; }
      const naturalWidthPx = labelEl ? labelEl.getBoundingClientRect().width : 0;
      foEl.setAttribute('width', origFoWidth);
      if (naturalWidthPx > 0) {
        const requiredSvg = (naturalWidthPx + 32) * pxToSvg;
        const currentFoW = parseFloat(foEl.getAttribute('width') ?? '0');
        if (requiredSvg > currentFoW) {
          const diff = requiredSvg - currentFoW;
          const currentShapeW = parseFloat(rectEl.getAttribute('width') ?? '0');
          if (requiredSvg > currentShapeW) {
            const shapeDiff = requiredSvg - currentShapeW;
            const currentShapeX = parseFloat(rectEl.getAttribute('x') ?? '0');
            rectEl.setAttribute('width', String(requiredSvg));
            rectEl.setAttribute('x', String(currentShapeX - shapeDiff / 2));
          }
          const currentFoX = parseFloat(foEl.getAttribute('x') ?? '0');
          foEl.setAttribute('width', String(requiredSvg));
          foEl.setAttribute('x', String(currentFoX - diff / 2));
        }
      }
    }
    if (shapeWidth > 0) {
      const currentFoW = parseFloat(foEl.getAttribute('width') ?? '0');
      if (currentFoW > shapeWidth) {
        const excess = currentFoW - shapeWidth;
        const currentFoX = parseFloat(foEl.getAttribute('x') ?? '0');
        foEl.setAttribute('width', String(shapeWidth));
        foEl.setAttribute('x', String(currentFoX + excess / 2));
      }
    }
  });
}

// ─── UI ────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const sourceEl = $('source');
const renderBtn = $('render-btn');
const saveBtn = $('save-btn');
const authBtn = $('auth-btn');
const statusEl = $('status');
const previewEmpty = $('preview-empty');
const previewLoading = $('preview-loading');
const previewContent = $('preview-content');
const previewError = $('preview-error');
const errorMessage = $('error-message');
const diagramOutput = $('diagram-output');
const previewInner = $('preview-inner');
const shareModal = $('share-modal');
const shareUrl = $('share-url');
const copyBtn = $('copy-btn');
const shareClose = $('share-close');

let currentSource = '';
let currentSvg = '';
let currentScene = null;
let isAuthenticated = false;
let controlsCleanup = null;

function showPanel(panel) {
  previewEmpty.style.display = panel === 'empty' ? '' : 'none';
  previewLoading.style.display = panel === 'loading' ? '' : 'none';
  previewContent.style.display = panel === 'content' ? '' : 'none';
  previewError.style.display = panel === 'error' ? '' : 'none';
}

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'soom-status' + (type ? ' ' + type : '');
}

// Wait for mermaid to load
function waitForMermaid() {
  return new Promise((resolve) => {
    if (window.mermaid) { resolve(); return; }
    const check = setInterval(() => {
      if (window.mermaid) { clearInterval(check); resolve(); }
    }, 100);
    setTimeout(() => { clearInterval(check); resolve(); }, 10000);
  });
}

// ─── Auth ──────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const res = await fetch('/auth/me', { credentials: 'same-origin' });
    const data = await res.json();
    if (data.authenticated) {
      isAuthenticated = true;
      authBtn.textContent = data.login;
      authBtn.disabled = true;
      saveBtn.disabled = !currentScene;
    }
  } catch {}
}

authBtn.addEventListener('click', () => {
  window.location.href = '/auth/github';
});

// ─── Render ────────────────────────────────────────────────────
async function handleRender() {
  const source = sourceEl.value.trim();
  if (!source) return;

  renderBtn.disabled = true;
  showPanel('loading');
  setStatus('');

  // Rate limit check for anonymous users
  if (!isAuthenticated) {
    try {
      const res = await fetch('/api/render-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showPanel('error');
        errorMessage.textContent = data.error || 'Rate limit exceeded. Sign in for more renders, or try again later.';
        renderBtn.disabled = false;
        return;
      }
    } catch {}
  }

  const timeout = setTimeout(() => {
    showPanel('error');
    errorMessage.textContent = 'Render timed out (15s limit). Try a simpler diagram or check your Mermaid syntax.';
    renderBtn.disabled = false;
  }, RENDER_TIMEOUT_MS);

  try {
    // Clean up previous animation
    if (controlsCleanup) { controlsCleanup(); controlsCleanup = null; }
    window.soomAnimation = undefined;
    diagramOutput.innerHTML = '';
    const existingControls = previewInner.querySelector('.soom-controls');
    if (existingControls) existingControls.remove();
    const existingHelp = previewInner.querySelector('.soom-help-modal');
    if (existingHelp) existingHelp.remove();
    const existingAnnot = previewInner.querySelector('#soom-annotations');
    if (existingAnnot) existingAnnot.remove();
    const existingPin = previewInner.querySelector('#soom-progress-pin');
    if (existingPin) existingPin.remove();

    const { svg, scene } = await runPipeline(source, diagramOutput);
    clearTimeout(timeout);

    currentSource = source;
    currentSvg = svg;
    currentScene = scene;

    // Insert controls
    const controlsContainer = document.createElement('div');
    controlsContainer.innerHTML = getControlsHtml();
    while (controlsContainer.firstChild) {
      previewInner.appendChild(controlsContainer.firstChild);
    }

    // Insert scene JSON and boot runtime
    const sceneScript = document.createElement('script');
    sceneScript.id = 'soom-scene';
    sceneScript.type = 'application/json';
    sceneScript.textContent = JSON.stringify(scene);
    previewInner.appendChild(sceneScript);

    if (typeof window.bootRuntime === 'function') {
      window.soomAnimation = window.bootRuntime(scene);
      // Boot controls script inline
      bootControls();
    }

    showPanel('content');
    saveBtn.disabled = !isAuthenticated;
    setStatus(`Rendered (${graph_node_count(scene)} nodes)`, 'success');
  } catch (err) {
    clearTimeout(timeout);
    showPanel('error');
    errorMessage.textContent = err.message || 'Rendering failed. Check your Mermaid syntax.';
  }

  renderBtn.disabled = false;
}

function graph_node_count(scene) {
  return Object.keys(scene.elements.nodes).length;
}

// Inline controls boot (same logic as src/output/controls.ts)
function bootControls() {
  const controls = $('soom-controls');
  if (!controls || !window.soomAnimation) return;
  const api = window.soomAnimation;
  const btnStepBack = $('soom-step-back');
  const btnPlayPause = $('soom-play-pause');
  const btnStepFwd = $('soom-step-fwd');
  const scrubber = $('soom-scrubber');
  const stepCounter = $('soom-step-counter');
  const btnSpeed = $('soom-speed');
  const btnLoop = $('soom-loop');
  const btnHelp = $('soom-help');
  const helpModal = $('soom-help-modal');
  const helpClose = $('soom-help-close');
  const progressPinFill = $('soom-progress-pin-fill');
  let helpInvoker = null;

  const speeds = [0.5, 1, 2, 4];
  let speedIdx = 1;
  let isPlaying = true;
  let loopEnabled = false;
  try { loopEnabled = localStorage.getItem('soom-loop') === '1'; } catch {}
  let scrubbingActive = false;
  const totalSteps = api.totalSteps;

  if (totalSteps === 0) {
    if (scrubber) { scrubber.max = '0'; scrubber.disabled = true; }
    if (stepCounter) stepCounter.textContent = '—';
    if (btnStepBack) btnStepBack.disabled = true;
    if (btnStepFwd) btnStepFwd.disabled = true;
  } else {
    if (scrubber) scrubber.max = String(totalSteps);
  }

  function updatePlayPause() {
    if (!btnPlayPause) return;
    btnPlayPause.textContent = isPlaying ? '⏸' : '▶';
    btnPlayPause.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  }

  function updateScrubber() {
    if (totalSteps === 0) return;
    const cur = api.currentStep;
    if (scrubber && !scrubbingActive) scrubber.value = String(cur);
    if (stepCounter) stepCounter.textContent = cur + '/' + totalSteps;
  }

  function updateProgressPin() {
    if (!progressPinFill) return;
    let p = api.progress;
    if (typeof p !== 'number') return;
    if (p < 0) p = 0; else if (p > 1) p = 1;
    progressPinFill.style.width = (p * 100) + '%';
  }

  let rafId;
  (function rafLoop() {
    updateScrubber();
    updateProgressPin();
    rafId = requestAnimationFrame(rafLoop);
  })();

  function flashSeek() {
    const panel = $('preview-panel');
    if (!panel) return;
    panel.classList.remove('soom-seeking');
    void panel.offsetWidth;
    panel.classList.add('soom-seeking');
  }

  if (btnStepBack) btnStepBack.addEventListener('click', () => { isPlaying = false; updatePlayPause(); flashSeek(); api.stepBackward(); });
  if (btnPlayPause) btnPlayPause.addEventListener('click', () => {
    if (isPlaying) { api.pause(); isPlaying = false; } else { api.play(); isPlaying = true; }
    updatePlayPause();
  });
  if (btnStepFwd) btnStepFwd.addEventListener('click', () => { isPlaying = false; updatePlayPause(); flashSeek(); api.stepForward(); });

  if (scrubber) {
    scrubber.addEventListener('mousedown', () => { scrubbingActive = true; });
    scrubber.addEventListener('touchstart', () => { scrubbingActive = true; }, { passive: true });
    scrubber.addEventListener('input', () => { flashSeek(); api.goToStep(parseInt(scrubber.value, 10)); });
    scrubber.addEventListener('mouseup', () => { scrubbingActive = false; });
    scrubber.addEventListener('touchend', () => { scrubbingActive = false; }, { passive: true });
  }

  if (btnSpeed) btnSpeed.addEventListener('click', () => {
    speedIdx = (speedIdx + 1) % speeds.length;
    api.setSpeed(speeds[speedIdx]);
    btnSpeed.textContent = (speeds[speedIdx] === 0.5 ? '0.5' : String(speeds[speedIdx])) + '×';
  });

  function syncLoopState(on) {
    api.timeline.loop = on;
    api.timeline.iterationCount = on ? Infinity : 1;
  }
  syncLoopState(loopEnabled);

  if (btnLoop) {
    btnLoop.classList.toggle('soom-ctrl-active', loopEnabled);
    btnLoop.setAttribute('aria-pressed', String(loopEnabled));
    btnLoop.addEventListener('click', () => {
      loopEnabled = !loopEnabled;
      syncLoopState(loopEnabled);
      btnLoop.classList.toggle('soom-ctrl-active', loopEnabled);
      btnLoop.setAttribute('aria-pressed', String(loopEnabled));
      try { localStorage.setItem('soom-loop', loopEnabled ? '1' : '0'); } catch {}
    });
  }

  function isHelpOpen() { return helpModal?.classList.contains('soom-help-open'); }
  function openHelp() {
    if (!helpModal || isHelpOpen()) return;
    helpInvoker = document.activeElement;
    helpModal.classList.add('soom-help-open');
    helpModal.setAttribute('aria-hidden', 'false');
    helpClose?.focus();
  }
  function closeHelp() {
    if (!helpModal || !isHelpOpen()) return;
    helpModal.classList.remove('soom-help-open');
    helpModal.setAttribute('aria-hidden', 'true');
    if (helpInvoker?.focus) helpInvoker.focus();
    helpInvoker = null;
  }
  if (btnHelp) btnHelp.addEventListener('click', openHelp);
  if (helpClose) helpClose.addEventListener('click', closeHelp);
  if (helpModal) helpModal.addEventListener('click', (e) => { if (e.target === helpModal) closeHelp(); });

  api.timeline.onComplete = () => {
    if (!api.timeline.loop) { isPlaying = false; updatePlayPause(); }
  };

  updatePlayPause();
  updateScrubber();

  controlsCleanup = () => { cancelAnimationFrame(rafId); };
}

// ─── Save/Share ────────────────────────────────────────────────
async function handleSave() {
  if (!currentScene || !isAuthenticated) return;
  saveBtn.disabled = true;
  setStatus('Saving...');

  try {
    const html = generateStandaloneHtml(currentSvg, currentScene);
    let ogImage = null;
    try { ogImage = await captureOgImage(); } catch {}

    const res = await fetch('/api/save', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: currentSource,
        html,
        ogImage,
        title: extractTitle(currentSource),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Save failed');
    }

    const data = await res.json();
    shareUrl.value = data.url;
    shareModal.classList.add('open');
    setStatus('Shared!', 'success');
  } catch (err) {
    setStatus(err.message, 'error');
  }

  saveBtn.disabled = false;
}

function extractTitle(source) {
  const match = source.match(/^---\s*\ntitle:\s*(.+)/m);
  return match ? match[1].trim() : '';
}

function generateStandaloneHtml(svg, scene) {
  // Fetch runtime bundle text (loaded as script, read back from DOM)
  const runtimeScript = document.querySelector('script[src*="runtime.js"]');
  let runtimeText = '';
  // We can't easily read the script content from the DOM, so we'll use a
  // placeholder. The server stores the HTML as-is — the runtime is already
  // executing in the saved HTML via the same <script> tag pattern as CLI output.

  const themeCss = document.querySelector('link[href*="diagram.css"]');
  let cssText = '';
  // For standalone, we inline the CSS from the stylesheet
  for (const sheet of document.styleSheets) {
    if (sheet.href?.includes('diagram.css')) {
      try {
        cssText = Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
      } catch {}
    }
  }

  // Fetch runtime.js text synchronously via a cached copy
  if (window._runtimeBundleText) {
    runtimeText = window._runtimeBundleText;
  }

  const sceneJson = JSON.stringify(scene);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hansoom Diagram</title>
  <style>
    body {
      background-color: #1E2A3A;
      background-image: radial-gradient(circle, #3D5A6E 1px, transparent 1px);
      background-size: 24px 24px;
      color: #E8EDF2;
      margin: 0;
      padding: 2rem;
      padding-bottom: calc(2rem + 64px);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --soom-bg: #1E2A3A;
      --soom-text: #E8EDF2;
      --soom-grid-dot: #3D5A6E;
      --soom-accent: #0A7BC4;
      --soom-accent-glow: rgba(10, 123, 196, 0.6);
      --soom-edge-color: #5B9BD5;
      --soom-edge-glow: rgba(91, 155, 213, 0.5);
      --soom-node-shadow: rgba(0, 0, 0, 0.5);
      --soom-edge-shadow: rgba(0, 0, 0, 0.35);
      --soom-completed-fill: #A8C4EC;
      --soom-annot-bg: rgba(30, 42, 58, 0.92);
      --soom-annot-text: #A8C4EC;
      --soom-annot-border: rgba(10, 123, 196, 0.3);
      --soom-controls-bg: rgba(16, 24, 36, 0.92);
      --soom-controls-hover: rgba(255, 255, 255, 0.08);
      --soom-edge-stroke: rgba(168, 196, 236, 0.45);
      --soom-edge-stroke-active: #C0D8F8;
      --soom-marker-fill: rgba(192, 216, 248, 0.85);
      --soom-label-color: #E8EDF2;
      --soom-edge-label-bg: rgba(22, 34, 50, 0.88);
      --soom-edge-label-text: #A8C4EC;
      --soom-subgraph-bg: rgba(26, 75, 122, 0.35);
      --soom-subgraph-nested-bg: rgba(46, 95, 138, 0.35);
      --soom-subgraph-border: #5B7BAD;
      --soom-subgraph-label: #8BAAC8;
      --soom-cluster-text: #A8C4EC;
      --soom-shadow-rest: rgba(0, 0, 0, 0.55);
      --soom-shadow-active: rgba(0, 0, 0, 0.7);
      --soom-shadow-completed: rgba(0, 0, 0, 0.5);
    }
    .diagram-container { width: 100%; max-width: 100%; max-height: 90vh; }
    .diagram-container svg { width: 100%; height: auto; display: block; margin: 0 auto; }
    ${cssText}
  </style>
</head>
<body>
  <div class="diagram-container">${svg}</div>
  <script id="soom-scene" type="application/json">${sceneJson}</script>
  <script>${runtimeText}</script>
  <script>if(typeof bootRuntime==='function'){window.soomAnimation=bootRuntime(JSON.parse(document.getElementById('soom-scene').textContent));}</script>
</body>
</html>`;
}

async function captureOgImage() {
  const svgEl = diagramOutput.querySelector('svg');
  if (!svgEl) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1E2A3A';
  ctx.fillRect(0, 0, 1200, 630);

  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1100 / img.width, 580 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (1200 - w) / 2, (630 - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ─── Event Binding ─────────────────────────────────────────────
sourceEl.addEventListener('input', () => {
  renderBtn.disabled = !sourceEl.value.trim();
});

renderBtn.addEventListener('click', handleRender);
saveBtn.addEventListener('click', handleSave);

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(shareUrl.value).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
  });
});

shareClose.addEventListener('click', () => {
  shareModal.classList.remove('open');
});

shareModal.addEventListener('click', (e) => {
  if (e.target === shareModal) shareModal.classList.remove('open');
});

// Ctrl/Cmd+Enter to render
sourceEl.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (!renderBtn.disabled) handleRender();
  }
});

// ─── Init ──────────────────────────────────────────────────────
async function init() {
  await waitForMermaid();
  initMermaid();
  renderBtn.disabled = !sourceEl.value.trim();

  // Pre-fetch runtime bundle text for standalone HTML generation
  try {
    const res = await fetch('/assets/runtime.js');
    window._runtimeBundleText = await res.text();
  } catch {}

  checkAuth();
}

init();
