/**
 * AnimationScene IR — typed JSON contract between build-time and runtime.
 * See plan/refactor/animation-runtime-system-design.md §3.2.
 */

export type NodeId = string;
export type EdgeId = string;

/**
 * The literal anime.js easings emitted into the Scene. Extend this union
 * before introducing a new easing in build.ts — the runtime in R3 will
 * pattern-match on it.
 */
export type EasingName =
  | 'linear'
  | 'inOutQuad'
  | 'outQuad'
  | 'inOutSine'
  | 'outCubic'
  | 'spring(1,80,10,0)';

export interface SceneNode {
  svgId: string;
  label: string;
}

export interface SceneEdge {
  svgId: string;
  source: NodeId;
  target: NodeId;
  label?: string;
  labelSvgId?: string;
  drawDuration: number;
  easing: EasingName;
}

export interface SceneElements {
  nodes: Record<NodeId, SceneNode>;
  edges: Record<EdgeId, SceneEdge>;
}

export interface SceneStep {
  id: string;
  activate: { nodes: NodeId[]; edges: EdgeId[] };
  parallel: boolean;
  reveal?: { rectIds: string[]; activationBarIds: string[] };
}

export interface SceneTiming {
  idleGap: number;
  endHold: number;
  interStepGap: number;
  loopDelay: number;
}

export interface AnimationScene {
  version: 1;
  diagramType: 'flowchart' | 'sequence';
  elements: SceneElements;
  steps: SceneStep[];
  timing: SceneTiming;
}
