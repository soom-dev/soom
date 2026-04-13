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
  `,
};
