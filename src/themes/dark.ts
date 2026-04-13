export const darkTheme = {
  background: '#362F49',
  foreground: '#e0e0e0',
  accent: '#2FD9D4',
  highlight: '#2A2440',
  border: '#2FD9D4',
  text: '#e0e0e0',
  nodeFill: '#2A2440',
  nodeStroke: '#2FD9D4',
  edgeStroke: '#FD58D1',
  css: `
    body.soom-dark {
      background-color: #362F49;
      background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 24px 24px;
      color: #e0e0e0;
      margin: 0;
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body.soom-dark .diagram-container {
      width: 100%;
      max-width: 100%;
      max-height: 90vh;
    }
    body.soom-dark .diagram-container svg {
      width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    /* Node shadows */
    body.soom-dark .node rect,
    body.soom-dark .node polygon,
    body.soom-dark .node circle {
      filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.4));
    }
    /* Edge shadows */
    body.soom-dark .edgePath path,
    body.soom-dark .flowchart-link {
      filter: drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.3));
    }
    /* Subgraph hierarchy */
    body.soom-dark .cluster rect { stroke-dasharray: 8 4; stroke-width: 2px; }
    body.soom-dark .cluster .cluster rect { stroke-dasharray: 2 4; stroke-width: 1.5px; }
    /* Watermark */
    body.soom-dark .soom-watermark {
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      text-decoration: none;
      width: 408px;
      height: 61px;
    }
    body.soom-dark .soom-wm-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    body.soom-dark .soom-wm-char {
      fill: none;
      stroke: #2FD9D4;
      stroke-width: 2;
    }
    /* Animation states */
    body.soom-dark .node { transition: opacity 300ms ease-in-out, filter 300ms ease-in-out; }
    body.soom-dark .node.soom-node-active rect,
    body.soom-dark .node.soom-node-active polygon,
    body.soom-dark .node.soom-node-active circle { fill: #2FD9D4; stroke: #2FD9D4; filter: drop-shadow(0 0 12px rgba(47, 217, 212, 0.6)); }
    body.soom-dark .node.soom-node-active { opacity: 1; }
    body.soom-dark .node.soom-node-completed rect,
    body.soom-dark .node.soom-node-completed polygon,
    body.soom-dark .node.soom-node-completed circle { fill: #3A5A7C; stroke: #2FD9D4; }
    body.soom-dark .node.soom-node-completed { opacity: 0.85; }
    body.soom-dark .edgePath path,
    body.soom-dark .flowchart-link { transition: stroke 300ms ease-in-out, opacity 300ms ease-in-out; }
    /* Marching dotted line on completed edges */
    body.soom-dark .soom-edge-completed { stroke-dasharray: 4 8 !important; animation: soom-march 0.8s linear infinite; stroke: #FD58D1 !important; opacity: 1 !important; }
    @keyframes soom-march { to { stroke-dashoffset: -12; } }
    /* Annotation panel */
    body.soom-dark #soom-annotations {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(54, 47, 73, 0.92); color: #ffa726; padding: 14px 28px;
      border-radius: 10px; font-size: 18px; z-index: 20;
      backdrop-filter: blur(8px); border: 1px solid rgba(47, 217, 212, 0.2);
      transition: opacity 300ms ease; max-width: 650px; text-align: center;
      opacity: 0; line-height: 1.6;
    }
    /* Flow particle */
    body.soom-dark .soom-flow-particle { fill: #FD58D1; filter: drop-shadow(0 0 6px rgba(253, 88, 209, 0.6)); }
  `,
};
