// Light-mode is a derivative of the canonical Sapphire Nightfall palette, not
// a parallel brand. Same hue family as dark (`#0A7BC4` cobalt sapphire), only
// luminance shifted: a deeper accent (`#0A5A8C`) reads strongly on a near-
// white ground; the dark-mode accent doubles as the light-mode edge color so
// the two tones form a tonal pair. The previous palette used violet
// `#6C5CE7` + magenta `#E84393` — divergent from the brand and below WCAG
// non-text contrast on the subgraph border (1.13:1). See
// `_context/DESIGN.md` § Light mode for derivation rationale + contrast math.
export const lightTheme = {
  background: '#F4F8FC',
  foreground: '#1a1a2e',
  accent: '#0A5A8C',
  highlight: '#CFE3F4',
  border: '#0A5A8C',
  text: '#1a1a2e',
  nodeFill: '#CFE3F4',
  nodeStroke: '#0A5A8C',
  edgeStroke: '#0A7BC4',
  css: `
    body.soom-light {
      --soom-bg: #F4F8FC;
      --soom-text: #1a1a2e;
      --soom-grid-dot: rgba(0,0,0,0.1);
      --soom-accent: #0A5A8C;
      --soom-accent-glow: rgba(10, 90, 140, 0.4);
      --soom-edge-color: #0A7BC4;
      --soom-edge-glow: rgba(10, 123, 196, 0.4);
      --soom-node-shadow: rgba(0, 0, 0, 0.12);
      --soom-edge-shadow: rgba(0, 0, 0, 0.1);
      --soom-completed-fill: #CFE3F4;
      --soom-annot-bg: rgba(244, 248, 252, 0.95);
      --soom-annot-text: #0A5A8C;
      --soom-annot-border: rgba(10, 90, 140, 0.2);
      --soom-controls-bg: rgba(228, 238, 248, 0.92);
      --soom-controls-hover: rgba(0, 0, 0, 0.08);
      --soom-edge-stroke: rgba(26, 26, 46, 0.4);
      --soom-edge-stroke-active: #1A3A5C;
      --soom-marker-fill: rgba(26, 26, 46, 0.8);
      --soom-label-color: #1a1a2e;
      --soom-edge-label-bg: rgba(244, 248, 252, 0.9);
      --soom-edge-label-text: #444;
      --soom-subgraph-bg: rgba(207, 227, 244, 0.5);
      --soom-subgraph-nested-bg: rgba(184, 213, 237, 0.45);
      --soom-subgraph-border: #3A7DA8;
      --soom-subgraph-label: #555;
      --soom-cluster-text: #333;
      --soom-shadow-rest: rgba(0, 0, 0, 0.2);
      --soom-shadow-active: rgba(0, 0, 0, 0.35);
      --soom-shadow-completed: rgba(0, 0, 0, 0.25);
    }
  `,
};
