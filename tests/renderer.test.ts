import { describe, it, expect } from 'bun:test';
import { renderHtml } from '../src/output/html.js';

describe('HTML Renderer', () => {
  it('should produce a valid HTML document', async () => {
    const svg = '<svg><text>Hello</text></svg>';
    const html = await renderHtml(svg, 'dark');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  it('should use dark theme by default', async () => {
    const html = await renderHtml('<svg></svg>');
    expect(html).toContain('class="soom-dark"');
    expect(html).toContain('#1E2A3A');
  });

  it('should use light theme when specified', async () => {
    const html = await renderHtml('<svg></svg>', 'light');
    expect(html).toContain('class="soom-light"');
    expect(html).toContain('#F4F8FC');
  });

  it('should include viewport meta tag', async () => {
    const html = await renderHtml('<svg></svg>');
    expect(html).toContain('viewport');
    expect(html).toContain('width=device-width');
  });

  it('should be self-contained with no external resources', async () => {
    const html = await renderHtml('<svg></svg>');
    // Watermark <a> link to hansoom.dev is intentional, not a resource
    expect(html).not.toContain('src="http');
    expect(html).not.toMatch(/<link[^>]*href="https?:\/\//);
  });

  it('should include Content-Security-Policy meta tag', async () => {
    const html = await renderHtml('<svg></svg>');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("default-src 'none'");
  });

  it('should sanitize dangerous SVG content', async () => {
    const maliciousSvg = '<svg><script>alert("xss")</script><text>Safe</text></svg>';
    const html = await renderHtml(maliciousSvg);
    // The XSS payload should be stripped from the diagram SVG
    expect(html).not.toContain('alert("xss")');
    expect(html).toContain('Safe');
  });
});
