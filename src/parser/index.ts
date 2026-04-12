import type { AnimaGraph } from '../graph/types.js';

export interface DiagramParser {
  parse(source: string): Promise<AnimaGraph>;
  supports(filename: string): boolean;
}
