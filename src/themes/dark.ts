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
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .diagram-container {
      max-width: 100%;
      overflow: auto;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  `,
};
