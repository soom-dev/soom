export const lightTheme = {
  background: '#F8F6FF',
  foreground: '#1a1a2e',
  accent: '#6C5CE7',
  highlight: '#EDE9FE',
  border: '#6C5CE7',
  text: '#1a1a2e',
  nodeFill: '#EDE9FE',
  nodeStroke: '#6C5CE7',
  edgeStroke: '#E84393',
  css: `
    body.soom-light {
      background-color: #F8F6FF;
      background-image: radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px);
      background-size: 24px 24px;
      color: #1a1a2e;
      margin: 0;
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body.soom-light .diagram-container {
      width: 100%;
      max-width: 100%;
      max-height: 90vh;
    }
    body.soom-light .diagram-container svg {
      width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    /* Node shadows */
    body.soom-light .node rect,
    body.soom-light .node polygon,
    body.soom-light .node circle {
      filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.12));
    }
    /* Edge shadows */
    body.soom-light .edgePath path,
    body.soom-light .flowchart-link {
      filter: drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.1));
    }
    /* Subgraph hierarchy */
    body.soom-light .cluster rect { stroke-dasharray: 8 4; stroke-width: 2px; }
    body.soom-light .cluster .cluster rect { stroke-dasharray: 2 4; stroke-width: 1.5px; }
    /* Watermark */
    body.soom-light .soom-watermark {
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      text-decoration: none;
      width: 408px;
      height: 61px;
    }
    body.soom-light .soom-wm-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    body.soom-light .soom-wm-char {
      fill: none;
      stroke: #6C5CE7;
      stroke-width: 2;
    }
    /* Animation states */
    body.soom-light .node.soom-node-active rect,
    body.soom-light .node.soom-node-active polygon,
    body.soom-light .node.soom-node-active circle { fill: #6C5CE7; stroke: #6C5CE7; filter: drop-shadow(0 0 12px rgba(108, 92, 231, 0.4)); }
    body.soom-light .node.soom-node-active { opacity: 1; }
    body.soom-light .node.soom-node-completed rect,
    body.soom-light .node.soom-node-completed polygon,
    body.soom-light .node.soom-node-completed circle { fill: #DDD6FE; stroke: #6C5CE7; }
    body.soom-light .node.soom-node-completed { opacity: 0.85; }
    /* Completed edge base style (marching animation driven by anime.js) */
    body.soom-light .soom-edge-completed { stroke: #E84393; opacity: 1; }
    /* Annotation panel */
    body.soom-light #soom-annotations {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(248, 246, 255, 0.95); color: #6C5CE7; padding: 14px 28px;
      border-radius: 10px; font-size: 18px; z-index: 20;
      backdrop-filter: blur(8px); border: 1px solid rgba(108, 92, 231, 0.2);
      transition: opacity 300ms ease; max-width: 650px; text-align: center;
      opacity: 0; line-height: 1.6;
    }
    /* Flow particle */
    body.soom-light .soom-flow-particle { fill: #E84393; filter: drop-shadow(0 0 6px rgba(232, 67, 147, 0.4)); }
  `,
};
