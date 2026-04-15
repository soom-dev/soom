export type NodeType = 'default' | 'decision' | 'database' | 'start' | 'end' | 'process' | 'io';

export type EdgeStyle = 'solid' | 'dashed' | 'dotted' | 'thick';

export type SourceFormat = 'mermaid' | 'd2' | 'plantuml';

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  position: Position;
  style?: string;
  subgraph?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  path: string;
  style: EdgeStyle;
}

export interface Subgraph {
  id: string;
  label: string;
  nodeIds: string[];
  position: Position;
}

export interface AnimaGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  subgraphs: Subgraph[];
  metadata: {
    title?: string;
    sourceFormat: SourceFormat;
    sourceText: string;
  };
}

export interface AnimationStep {
  id: string;
  activateEdges: string[];
  activateNodes: string[];
  annotation?: string;
  duration: number;
  parallel: boolean;
}

export interface AnimationSequence {
  steps: AnimationStep[];
  defaultDuration: number;
  title?: string;
}

export interface DiagramParser {
  parse(source: string): Promise<AnimaGraph>;
  supports(filename: string): boolean;
}
