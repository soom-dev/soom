export const baseCss = `
    body {
      background-color: var(--soom-bg);
      background-image: radial-gradient(circle, var(--soom-grid-dot) 1px, transparent 1px);
      background-size: 24px 24px;
      color: var(--soom-text);
      margin: 0;
      padding: 2rem;
      padding-bottom: calc(2rem + 64px);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .diagram-container {
      width: 100%;
      max-width: 100%;
      max-height: 90vh;
    }
    .diagram-container svg {
      width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    /* Node shadow elevation managed by timeline.set() at t=0 */
    /* Edge shadows */
    .edgePath path,
    .flowchart-link {
      filter: drop-shadow(1px 2px 3px var(--soom-edge-shadow));
    }

    /* ── Mermaid SVG overrides ──────────────────────────────────── */
    /* Edges: override mermaid's #0b0b0b stroke with theme-aware color */
    .edgePath .path,
    .flowchart-link {
      stroke: var(--soom-edge-stroke) !important;
    }
    /* Arrowhead markers */
    .marker { fill: var(--soom-marker-fill) !important; stroke: var(--soom-marker-fill) !important; }
    .arrowheadPath { fill: var(--soom-marker-fill) !important; }
    marker path { fill: var(--soom-marker-fill) !important; stroke: var(--soom-marker-fill) !important; }
    /* Node labels: override mermaid's fill:#333 / color:#333 */
    .label text,
    .nodeLabel,
    .node .label text,
    .label span,
    .node .label span,
    .node .label foreignObject,
    .label foreignObject {
      fill: var(--soom-label-color) !important;
      color: var(--soom-label-color) !important;
    }
    /* Node label layout: center in foreignObject, prevent overflow.
       Mermaid v11 puts raw text directly inside foreignObject (no wrapper div/span).
       text-align centers inline text; overflow clips labels exceeding shape bounds. */
    .node foreignObject {
      overflow: hidden !important;
      text-align: center !important;
    }
    /* If Mermaid wraps content in a div (varies by version/shape), flex-center it */
    .node foreignObject > div {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      text-align: center !important;
      overflow: hidden !important;
      padding: 0 !important;
    }
    .nodeLabel {
      overflow: hidden !important;
      word-wrap: break-word !important;
      text-align: center !important;
      padding: 8px !important;
      line-height: 1.3 !important;
    }
    /* Edge labels: theme-aware background */
    .edgeLabel {
      background-color: var(--soom-edge-label-bg) !important;
      color: var(--soom-edge-label-text) !important;
    }
    .edgeLabel p {
      background-color: var(--soom-edge-label-bg) !important;
      color: var(--soom-edge-label-text) !important;
    }
    .edgeLabel rect {
      fill: var(--soom-edge-label-bg) !important;
      opacity: 0.9 !important;
    }
    .edgeLabel .label span {
      color: var(--soom-edge-label-text) !important;
    }
    /* Subgraph clusters: theme-aware fills and borders */
    .cluster rect {
      fill: var(--soom-subgraph-bg) !important;
      stroke: var(--soom-subgraph-border) !important;
      stroke-dasharray: 8 4;
      stroke-width: 1.5px !important;
    }
    /* Nested subgraph: slightly different fill for hierarchy */
    .cluster[data-depth="1"] rect,
    .cluster[data-depth="2"] rect {
      fill: var(--soom-subgraph-nested-bg) !important;
      stroke-dasharray: 4 3;
      stroke-width: 1.5px !important;
    }
    /* Cluster labels */
    .cluster-label text,
    .cluster-label span,
    .cluster text {
      fill: var(--soom-cluster-text) !important;
      color: var(--soom-cluster-text) !important;
    }
    /* Watermark */
    .soom-watermark {
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      text-decoration: none;
      width: 408px;
      height: 61px;
      transition: bottom 400ms ease;
    }
    .soom-controls-hidden .soom-watermark { bottom: 12px; }
    .soom-wm-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .soom-wm-char {
      fill: none;
      stroke: var(--soom-accent);
      stroke-width: 2;
    }
    /* Animation states */
    .node.soom-node-active rect,
    .node.soom-node-active polygon,
    .node.soom-node-active circle,
    .node.soom-node-active ellipse { fill: var(--soom-accent); stroke: var(--soom-accent); }
    .node.soom-node-active { opacity: 1; }
    .node.soom-node-completed rect,
    .node.soom-node-completed polygon,
    .node.soom-node-completed circle,
    .node.soom-node-completed ellipse { fill: var(--soom-completed-fill); stroke: var(--soom-accent); }
    .node.soom-node-completed { opacity: 0.85; }
    /* Completed edge base style (marching animation driven by anime.js) */
    .soom-edge-completed { stroke: var(--soom-edge-stroke-active) !important; opacity: 1 !important; }
    /* Annotation panel */
    #soom-annotations {
      display: none;
      position: fixed; bottom: 128px; left: 50%; transform: translateX(-50%);
      background: var(--soom-annot-bg); color: var(--soom-annot-text); padding: 14px 28px;
      border-radius: 10px; font-size: 18px; z-index: 20;
      backdrop-filter: blur(8px); border: 1px solid var(--soom-annot-border);
      transition: opacity 300ms ease, bottom 400ms ease; max-width: 650px; text-align: center;
      opacity: 0; line-height: 1.6;
    }
    .soom-controls-hidden #soom-annotations { bottom: 80px; }
    /* Flow particle */
    .soom-flow-particle { fill: var(--soom-edge-color); filter: drop-shadow(0 0 6px var(--soom-edge-glow)); }
    /* Seeking flash — brief background pulse on user-triggered step changes */
    @keyframes soom-seek-flash {
      0%   { box-shadow: inset 0 0 0 0 transparent; }
      40%  { box-shadow: inset 0 0 0 2px var(--soom-accent); }
      100% { box-shadow: inset 0 0 0 0 transparent; }
    }
    .soom-seeking { animation: soom-seek-flash 250ms ease forwards; }
    /* Playback controls */
    .soom-controls {
      position: fixed; bottom: 0; left: 0; right: 0; height: 48px;
      display: flex; align-items: center; padding: 0 12px; gap: 6px;
      background: var(--soom-controls-bg); backdrop-filter: blur(8px);
      z-index: 25; transition: opacity 400ms ease;
    }
    .soom-ctrl-btn {
      min-width: 44px; min-height: 44px; border: none; border-radius: 6px;
      background: transparent; color: var(--soom-text); cursor: pointer;
      font-size: 15px; display: flex; align-items: center; justify-content: center;
      transition: background 200ms ease; padding: 0; flex-shrink: 0;
    }
    .soom-ctrl-btn:hover { background: var(--soom-controls-hover); }
    .soom-ctrl-btn.soom-ctrl-active { color: var(--soom-accent); }
    #soom-scrubber {
      flex: 1; height: 4px; cursor: pointer; accent-color: var(--soom-accent);
      min-width: 60px;
    }
    #soom-step-counter {
      font-size: 12px; white-space: nowrap; opacity: 0.7;
      min-width: 44px; text-align: center; flex-shrink: 0;
    }
`;
