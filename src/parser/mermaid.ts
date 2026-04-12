import { JSDOM } from 'jsdom';
import mermaid from 'mermaid';
import type { DiagramParser } from './index.js';
import type { AnimaGraph, GraphNode, GraphEdge, NodeType, Position } from '../graph/types.js';

function inferNodeType(shape: string, label: string): NodeType {
  if (shape === 'diamond' || shape === 'rhombus') return 'decision';
  if (shape === 'cylinder' || label.startsWith('(')) return 'database';
  if (shape === 'stadium' || shape === 'round') return 'default';
  return 'default';
}

function parseTransform(transform: string | null): { x: number; y: number } {
  if (!transform) return { x: 0, y: 0 };
  const match = transform.match(/translate\(\s*([\d.-]+)[,\s]+([\d.-]+)\s*\)/);
  if (match) {
    return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
  }
  return { x: 0, y: 0 };
}

function extractNodeId(elementId: string): string {
  // Mermaid generates IDs like "flowchart-nodeName-123"
  const match = elementId.match(/^flowchart-(.+?)-\d+$/);
  return match ? match[1] : elementId;
}

export class MermaidParser implements DiagramParser {
  supports(filename: string): boolean {
    return /\.(mmd|mermaid)$/i.test(filename);
  }

  async parse(source: string): Promise<AnimaGraph> {
    const dom = new JSDOM(
      '<!DOCTYPE html><html><body><div id="mermaid-container"></div></body></html>',
      {
        pretendToBeVisual: true,
      }
    );

    const { window } = dom;
    const { document } = window;

    // Set up globals that mermaid expects
    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;
    (globalThis as Record<string, unknown>).navigator = window.navigator;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
      });

      // Validate syntax
      await mermaid.parse(source);

      // Render SVG
      const { svg } = await mermaid.render('soom-diagram', source);

      // Parse the SVG to extract graph structure
      const svgDom = new JSDOM(`<html><body>${svg}</body></html>`);
      const svgDoc = svgDom.window.document;

      const nodes = new Map<string, GraphNode>();
      const edges: GraphEdge[] = [];

      // Extract nodes
      const nodeElements = svgDoc.querySelectorAll('.node');
      nodeElements.forEach((el) => {
        const rawId = el.getAttribute('id') || '';
        const nodeId = extractNodeId(rawId);
        const labelEl = el.querySelector('.nodeLabel');
        const label = labelEl?.textContent?.trim() || nodeId;
        const transform = parseTransform(el.getAttribute('transform'));
        const bbox = el.querySelector('rect, polygon, circle, ellipse, path');
        const width = parseFloat(bbox?.getAttribute('width') || '100');
        const height = parseFloat(bbox?.getAttribute('height') || '40');

        const position: Position = {
          x: transform.x,
          y: transform.y,
          width: isNaN(width) ? 100 : width,
          height: isNaN(height) ? 40 : height,
        };

        const shapeEl = el.querySelector('polygon') ? 'diamond' : 'rect';
        const nodeType = inferNodeType(shapeEl, label);

        nodes.set(nodeId, {
          id: nodeId,
          label,
          type: nodeType,
          position,
        });
      });

      // Extract edges
      const edgePaths = svgDoc.querySelectorAll('.edgePath path, .edge-pattern-0 path');
      let edgeIndex = 0;
      edgePaths.forEach((pathEl) => {
        const d = pathEl.getAttribute('d') || '';
        const edgeId = `edge-${edgeIndex}`;

        // Try to determine source/target from parent element
        const parent = pathEl.closest('.edgePath') || pathEl.parentElement;
        const parentId = parent?.getAttribute('id') || '';

        // Mermaid edge IDs follow patterns like "L-A-B" or "L_A_B"
        const edgeMatch = parentId.match(/L[-_](.+?)[-_](.+?)$/);
        let source = '';
        let target = '';
        if (edgeMatch) {
          source = edgeMatch[1];
          target = edgeMatch[2];
        }

        edges.push({
          id: edgeId,
          source,
          target,
          path: d,
          style: 'solid',
        });
        edgeIndex++;
      });

      // Extract edge labels
      const edgeLabels = svgDoc.querySelectorAll('.edgeLabel');
      edgeLabels.forEach((el, i) => {
        const labelText = el.textContent?.trim();
        if (labelText && edges[i]) {
          edges[i].label = labelText;
        }
      });

      return {
        nodes,
        edges,
        subgraphs: [],
        metadata: {
          sourceFormat: 'mermaid',
          sourceText: source,
        },
      };
    } finally {
      delete (globalThis as Record<string, unknown>).window;
      delete (globalThis as Record<string, unknown>).document;
      delete (globalThis as Record<string, unknown>).navigator;
      dom.window.close();
    }
  }
}
