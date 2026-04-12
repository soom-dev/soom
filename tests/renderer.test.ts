import { describe, it, expect } from 'bun:test';
import { renderHtml } from '../src/renderer/html.js';

describe('HTML Renderer', () => {
  it('should produce a valid HTML document', () => {
    const svg = '<svg><text>Hello</text></svg>';
    const html = renderHtml(svg, 'dark');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain(svg);
    expect(html).toContain('</html>');
  });

  it('should use dark theme by default', () => {
    const html = renderHtml('<svg></svg>');
    expect(html).toContain('#1a1a2e');
  });

  it('should use light theme when specified', () => {
    const html = renderHtml('<svg></svg>', 'light');
    expect(html).toContain('#ffffff');
    expect(html).not.toContain('#1a1a2e');
  });

  it('should include viewport meta tag', () => {
    const html = renderHtml('<svg></svg>');
    expect(html).toContain('viewport');
    expect(html).toContain('width=device-width');
  });

  it('should be self-contained with no external resources', () => {
    const html = renderHtml('<svg></svg>');
    expect(html).not.toContain('href="http');
    expect(html).not.toContain('src="http');
  });
});
