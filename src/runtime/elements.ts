import type { AnimationScene, EdgeId, NodeId } from '../animation/scene/types.js';

/**
 * Resolved DOM handles. Every node/edge in the Scene IR has a corresponding
 * SVG element; the runtime queries by build-time `svgId` (which the Scene
 * carries directly — no SVG-ID parsing at runtime).
 */
export interface ResolvedElements {
  svgRoot: SVGSVGElement;
  nodes: Map<NodeId, SVGGraphicsElement>;
  edges: Map<EdgeId, SVGPathElement>;
  edgeLabels: Map<EdgeId, SVGGraphicsElement>;
  edgeGroups: Map<EdgeId, SVGGraphicsElement>;
}

/**
 * Resolve every Scene element to its concrete SVG handle.
 *
 * Strategy:
 * - Nodes: `getElementById(node.svgId)` — Mermaid emits unique IDs per node.
 * - Edges: `path#<edge.svgId>` selector. Edge `<g>` parent is captured for
 *   particle-circle injection (CTM correctness, see particles.ts).
 * - Edge labels: query by `data-id` (Mermaid v11 pairs path & label via this
 *   attribute even when they live in separate parent groups).
 *
 * Missing elements are silently skipped — the timeline builder guards
 * against absent entries. This keeps a partial Scene from crashing the boot.
 */
export function resolveElements(scene: AnimationScene, svgRoot: SVGSVGElement): ResolvedElements {
  const nodes = new Map<NodeId, SVGGraphicsElement>();
  const edges = new Map<EdgeId, SVGPathElement>();
  const edgeLabels = new Map<EdgeId, SVGGraphicsElement>();
  const edgeGroups = new Map<EdgeId, SVGGraphicsElement>();

  for (const [nodeId, node] of Object.entries(scene.elements.nodes)) {
    const el = svgRoot.querySelector<SVGGraphicsElement>(`#${cssEscape(node.svgId)}`);
    if (el) {
      el.setAttribute('data-node-id', nodeId);
      nodes.set(nodeId, el);
    }
  }

  for (const [edgeId, edge] of Object.entries(scene.elements.edges)) {
    const path = svgRoot.querySelector<SVGPathElement>(`path#${cssEscape(edge.svgId)}`);
    if (path) {
      edges.set(edgeId, path);
      const group = path.parentElement as unknown as SVGGraphicsElement | null;
      if (group) edgeGroups.set(edgeId, group);
    }
    if (edge.labelSvgId) {
      const label = svgRoot.querySelector<SVGGraphicsElement>(
        `[data-id="${cssAttrEscape(edge.labelSvgId)}"]`
      );
      if (label) {
        const group = label.closest<SVGGraphicsElement>('.edgeLabel') ?? label;
        edgeLabels.set(edgeId, group);
      }
    }
  }

  return { svgRoot, nodes, edges, edgeLabels, edgeGroups };
}

/**
 * Escape a string for use as a CSS ID selector. Mermaid SVG IDs may contain
 * underscores, hyphens, and digits — already CSS-safe — but we defensively
 * escape just in case a future ID format introduces colons or dots.
 */
function cssEscape(id: string): string {
  const cssGlobal = (globalThis as { CSS?: { escape?: (s: string) => string } }).CSS;
  if (cssGlobal?.escape) return cssGlobal.escape(id);
  return id.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

/** Escape a string for use inside `[attr="..."]` attribute selector. */
function cssAttrEscape(value: string): string {
  return value.replace(/(["\\])/g, '\\$1');
}
