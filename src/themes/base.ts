export const baseCss = `
    body {
      background-color: var(--soom-bg);
      background-image: radial-gradient(circle, var(--soom-grid-dot) 1px, transparent 1px);
      background-size: 24px 24px;
      color: var(--soom-text);
      margin: 0;
      padding: 2rem;
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
    /* Node shadows */
    .node rect,
    .node polygon,
    .node circle {
      filter: drop-shadow(2px 4px 6px var(--soom-node-shadow));
    }
    /* Edge shadows */
    .edgePath path,
    .flowchart-link {
      filter: drop-shadow(1px 2px 3px var(--soom-edge-shadow));
    }
    /* Subgraph hierarchy */
    .cluster rect { stroke-dasharray: 8 4; stroke-width: 2px; }
    .cluster .cluster rect { stroke-dasharray: 2 4; stroke-width: 1.5px; }
    /* Watermark */
    .soom-watermark {
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      text-decoration: none;
      width: 408px;
      height: 61px;
    }
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
    .node.soom-node-active circle { fill: var(--soom-accent); stroke: var(--soom-accent); filter: drop-shadow(0 0 12px var(--soom-accent-glow)); }
    .node.soom-node-active { opacity: 1; }
    .node.soom-node-completed rect,
    .node.soom-node-completed polygon,
    .node.soom-node-completed circle { fill: var(--soom-completed-fill); stroke: var(--soom-accent); }
    .node.soom-node-completed { opacity: 0.85; }
    /* Completed edge base style (marching animation driven by anime.js) */
    .soom-edge-completed { stroke: var(--soom-edge-color); opacity: 1; }
    /* Annotation panel */
    #soom-annotations {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: var(--soom-annot-bg); color: var(--soom-annot-text); padding: 14px 28px;
      border-radius: 10px; font-size: 18px; z-index: 20;
      backdrop-filter: blur(8px); border: 1px solid var(--soom-annot-border);
      transition: opacity 300ms ease; max-width: 650px; text-align: center;
      opacity: 0; line-height: 1.6;
    }
    /* Flow particle */
    .soom-flow-particle { fill: var(--soom-edge-color); filter: drop-shadow(0 0 6px var(--soom-edge-glow)); }
`;
