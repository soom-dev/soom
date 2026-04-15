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
      --soom-bg: #F8F6FF;
      --soom-text: #1a1a2e;
      --soom-grid-dot: rgba(0,0,0,0.1);
      --soom-accent: #6C5CE7;
      --soom-accent-glow: rgba(108, 92, 231, 0.4);
      --soom-edge-color: #E84393;
      --soom-edge-glow: rgba(232, 67, 147, 0.4);
      --soom-node-shadow: rgba(0, 0, 0, 0.12);
      --soom-edge-shadow: rgba(0, 0, 0, 0.1);
      --soom-completed-fill: #DDD6FE;
      --soom-annot-bg: rgba(248, 246, 255, 0.95);
      --soom-annot-text: #6C5CE7;
      --soom-annot-border: rgba(108, 92, 231, 0.2);
      --soom-controls-bg: rgba(235, 230, 255, 0.92);
      --soom-controls-hover: rgba(0, 0, 0, 0.08);
      --soom-edge-stroke: rgba(26, 26, 46, 0.4);
      --soom-edge-stroke-active: #1a1a2e;
      --soom-marker-fill: rgba(26, 26, 46, 0.5);
      --soom-label-color: #1a1a2e;
      --soom-edge-label-bg: rgba(248, 246, 255, 0.9);
      --soom-edge-label-text: #444;
      --soom-subgraph-bg: rgba(237, 233, 254, 0.5);
      --soom-subgraph-nested-bg: rgba(221, 214, 254, 0.45);
      --soom-subgraph-border: rgba(108, 92, 231, 0.25);
      --soom-subgraph-label: #555;
      --soom-cluster-text: #333;
      --soom-shadow-rest: rgba(0, 0, 0, 0.15);
      --soom-shadow-active: rgba(0, 0, 0, 0.25);
      --soom-shadow-completed: rgba(0, 0, 0, 0.2);
    }
  `,
};
