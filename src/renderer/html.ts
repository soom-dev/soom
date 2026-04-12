import { darkTheme } from '../themes/dark.js';
import { lightTheme } from '../themes/light.js';

export type ThemeName = 'dark' | 'light';

export function renderHtml(svg: string, theme: ThemeName = 'dark'): string {
  const themeConfig = theme === 'light' ? lightTheme : darkTheme;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hansoom Diagram</title>
  <style>
    ${themeConfig.css}
  </style>
</head>
<body>
  <div class="diagram-container">
    ${svg}
  </div>
</body>
</html>`;
}
