export const darkTheme = {
  background: '#1a1a2e',
  foreground: '#e0e0e0',
  accent: '#0f3460',
  highlight: '#16213e',
  border: '#533483',
  text: '#e0e0e0',
  nodeFill: '#16213e',
  nodeStroke: '#533483',
  edgeStroke: '#0f3460',
  css: `
    body {
      background-color: #1a1a2e;
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
      stroke: #00d4ff;
      stroke-width: 2;
    }
    /* Animation states */
    .node { transition: opacity 300ms ease-in-out, filter 300ms ease-in-out; }
    .node.soom-node-active rect,
    .node.soom-node-active polygon,
    .node.soom-node-active circle { fill: #00d4ff; stroke: #00d4ff; }
    .node.soom-node-active { filter: url(#soom-glow); opacity: 1; }
    .node.soom-node-completed rect,
    .node.soom-node-completed polygon,
    .node.soom-node-completed circle { fill: #4a90d9; stroke: #4a90d9; }
    .node.soom-node-completed { opacity: 0.8; }
    .edgePath path { transition: stroke 300ms ease-in-out, opacity 300ms ease-in-out; }
    #soom-annotations {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(26, 26, 46, 0.9); color: #ffa726; padding: 12px 24px;
      border-radius: 8px; font-size: 14px; z-index: 20;
      transition: opacity 300ms ease; max-width: 600px; text-align: center;
      opacity: 0;
    }
    .soom-flow-particle { fill: #00d4ff; filter: url(#soom-glow); }
  `,
};
