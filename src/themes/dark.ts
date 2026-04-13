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
  `,
};
