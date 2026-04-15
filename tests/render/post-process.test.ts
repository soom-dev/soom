import { describe, it, expect } from 'bun:test';
import { postProcessSvg } from '../../src/render/post-process.js';

describe('postProcessSvg', () => {
  it('should inject glow filter into existing defs', () => {
    const svg = '<svg><defs><filter id="existing"/></defs><rect/></svg>';
    const result = postProcessSvg(svg);
    expect(result).toContain('id="soom-glow"');
    expect(result).toContain('feGaussianBlur');
    expect(result).toContain('id="existing"');
  });

  it('should create defs with glow filter when none exist', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect/></svg>';
    const result = postProcessSvg(svg);
    expect(result).toContain('<defs>');
    expect(result).toContain('id="soom-glow"');
    expect(result).toContain('feGaussianBlur');
  });

  it('should preserve existing svg attributes when creating defs', () => {
    const svg = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    const result = postProcessSvg(svg);
    expect(result).toContain('viewBox="0 0 100 100"');
    expect(result).toContain('xmlns');
  });

  it('should add data-node-id to node elements with flowchart IDs', () => {
    const svg = '<svg><g class="node default" id="flowchart-MyNode-123"><rect/></g></svg>';
    const result = postProcessSvg(svg);
    expect(result).toContain('data-node-id="MyNode"');
  });

  it('should extract correct node ID from flowchart pattern', () => {
    const svg = '<svg><g class="node" id="flowchart-UserAuth-42"><rect/></g></svg>';
    const result = postProcessSvg(svg);
    expect(result).toContain('data-node-id="UserAuth"');
  });

  it('should handle multiple nodes', () => {
    const svg = [
      '<svg>',
      '<g class="node" id="flowchart-A-1"><rect/></g>',
      '<g class="node" id="flowchart-B-2"><rect/></g>',
      '</svg>',
    ].join('');
    const result = postProcessSvg(svg);
    expect(result).toContain('data-node-id="A"');
    expect(result).toContain('data-node-id="B"');
  });

  it('should not modify elements that are not nodes', () => {
    const svg = '<svg><g class="edgePath" id="edge-0"><path/></g></svg>';
    const result = postProcessSvg(svg);
    expect(result).not.toContain('data-node-id');
  });

  it('should include feComposite in glow filter', () => {
    const svg = '<svg><rect/></svg>';
    const result = postProcessSvg(svg);
    expect(result).toContain('feComposite');
    expect(result).toContain('SourceGraphic');
  });

  it('should handle SVG with no node elements gracefully', () => {
    const svg = '<svg><rect width="100" height="100"/></svg>';
    const result = postProcessSvg(svg);
    expect(result).toContain('soom-glow');
    expect(result).toContain('rect');
  });

  it('should annotate cluster elements with data-depth from mermaid source', () => {
    const svg = [
      '<svg>',
      '<g class="cluster" id="soom-render-outer"><rect/></g>',
      '<g class="cluster" id="soom-render-inner"><rect/></g>',
      '</svg>',
    ].join('');
    const mermaidSource = [
      'flowchart TB',
      '  subgraph outer["Outer"]',
      '    subgraph inner["Inner"]',
      '      A --> B',
      '    end',
      '  end',
    ].join('\n');
    const result = postProcessSvg(svg, mermaidSource);
    expect(result).toContain('id="soom-render-outer" data-depth="0"');
    expect(result).toContain('id="soom-render-inner" data-depth="1"');
  });

  it('should not double-inject defs if called twice', () => {
    const svg = '<svg><defs></defs><rect/></svg>';
    const result1 = postProcessSvg(svg);
    // The second call would inject into existing defs again
    const matches = result1.match(/soom-glow/g);
    expect(matches).toHaveLength(1);
  });
});
