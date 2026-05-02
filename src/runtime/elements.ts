import type { AnimationScene } from '../animation/scene/types.js';

/**
 * Resolved DOM handles for every node, edge, and edge label in the scene.
 * Filled in by R3 — R2 returns empty maps.
 */
export interface ResolvedElements {
  nodes: Map<string, SVGGraphicsElement>;
  edges: Map<string, SVGPathElement>;
  edgeLabels: Map<string, SVGGraphicsElement>;
}

export function resolveElements(scene: AnimationScene): ResolvedElements {
  void scene;
  return {
    nodes: new Map(),
    edges: new Map(),
    edgeLabels: new Map(),
  };
}
