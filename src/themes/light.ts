export const lightTheme = {
  background: '#ffffff',
  foreground: '#1a1a1a',
  accent: '#4a90d9',
  highlight: '#f0f4f8',
  border: '#d1d5db',
  text: '#1a1a1a',
  nodeFill: '#f0f4f8',
  nodeStroke: '#d1d5db',
  edgeStroke: '#4a90d9',
  css: `
    body {
      background-color: #ffffff;
      color: #1a1a1a;
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
      stroke: #2563eb;
      stroke-width: 2;
    }
    /* Animation states */
    .node { transition: opacity 300ms ease-in-out, filter 300ms ease-in-out; }
    .node.soom-node-active rect,
    .node.soom-node-active polygon,
    .node.soom-node-active circle { fill: #2563eb; stroke: #2563eb; }
    .node.soom-node-active { filter: url(#soom-glow); opacity: 1; }
    .node.soom-node-completed rect,
    .node.soom-node-completed polygon,
    .node.soom-node-completed circle { fill: #93c5fd; stroke: #93c5fd; }
    .node.soom-node-completed { opacity: 0.8; }
    .edgePath path { transition: stroke 300ms ease-in-out, opacity 300ms ease-in-out; }
    #soom-annotations {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95); color: #d97706; padding: 12px 24px;
      border-radius: 8px; font-size: 14px; z-index: 20; border: 1px solid #e5e7eb;
      transition: opacity 300ms ease; max-width: 600px; text-align: center;
      opacity: 0;
    }
    .soom-flow-particle { fill: #2563eb; filter: url(#soom-glow); }
  `,
};
