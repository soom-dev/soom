import type { AnimaGraph, AnimationSequence, AnimationStep } from '../graph/types.js';

export function autoSequence(graph: AnimaGraph, defaultDuration = 800): AnimationSequence {
  const inDegree = new Map<string, number>();
  for (const [id] of graph.nodes) {
    inDegree.set(id, 0);
  }
  for (const edge of graph.edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const steps: AnimationStep[] = [];
  let stepIndex = 0;

  while (queue.length > 0) {
    const nextQueue: string[] = [];
    const activateNodes = [...queue];
    const activateEdges: string[] = [];

    for (const nodeId of queue) {
      for (const edge of graph.edges) {
        if (edge.source === nodeId) {
          activateEdges.push(edge.id);
          const newDeg = (inDegree.get(edge.target) ?? 1) - 1;
          inDegree.set(edge.target, newDeg);
          if (newDeg === 0) {
            nextQueue.push(edge.target);
          }
        }
      }
    }

    steps.push({
      id: `step-${stepIndex}`,
      activateNodes,
      activateEdges,
      duration: defaultDuration,
      parallel: activateNodes.length > 1,
    });

    stepIndex++;
    queue.length = 0;
    queue.push(...nextQueue);
  }

  return {
    steps,
    defaultDuration,
    title: graph.metadata.title,
  };
}
