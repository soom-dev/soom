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
