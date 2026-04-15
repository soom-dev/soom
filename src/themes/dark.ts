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
      --soom-bg: #362F49;
      --soom-text: #e0e0e0;
      --soom-grid-dot: rgba(255,255,255,0.06);
      --soom-accent: #2FD9D4;
      --soom-accent-glow: rgba(47, 217, 212, 0.6);
      --soom-edge-color: #FD58D1;
      --soom-edge-glow: rgba(253, 88, 209, 0.6);
      --soom-node-shadow: rgba(0, 0, 0, 0.4);
      --soom-edge-shadow: rgba(0, 0, 0, 0.3);
      --soom-completed-fill: #3A5A7C;
      --soom-annot-bg: rgba(54, 47, 73, 0.92);
      --soom-annot-text: #ffa726;
      --soom-annot-border: rgba(47, 217, 212, 0.2);
      --soom-controls-bg: rgba(30, 25, 50, 0.88);
      --soom-controls-hover: rgba(255, 255, 255, 0.1);
    }
  `,
};
