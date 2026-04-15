export const darkTheme = {
  background: '#1E2A3A',
  foreground: '#E8EDF2',
  accent: '#0A7BC4',
  highlight: '#162232',
  border: '#0A7BC4',
  text: '#E8EDF2',
  nodeFill: '#162232',
  nodeStroke: '#0A7BC4',
  edgeStroke: '#5B9BD5',
  css: `
    body.soom-dark {
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
      --soom-edge-stroke-active: #A8C4EC;
      --soom-marker-fill: rgba(168, 196, 236, 0.55);
      --soom-label-color: #E8EDF2;
      --soom-edge-label-bg: rgba(22, 34, 50, 0.88);
      --soom-edge-label-text: #A8C4EC;
      --soom-subgraph-bg: rgba(26, 75, 122, 0.35);
      --soom-subgraph-nested-bg: rgba(46, 95, 138, 0.35);
      --soom-subgraph-border: #5B7BAD;
      --soom-subgraph-label: #8BAAC8;
      --soom-cluster-text: #A8C4EC;
    }
  `,
};
