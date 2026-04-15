import type { AnimaGraph, AnimationSequence, AnimationStep } from '../types.js';

export function autoSequence(graph: AnimaGraph, defaultDuration = 800): AnimationSequence {
  const adj = new Map<string, { target: string; edgeId: string }[]>();
  const inDegree = new Map<string, number>();

  for (const [id] of graph.nodes) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push({ target: edge.target, edgeId: edge.id });
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Working copy of in-degrees — decremented as we process
  const remaining = new Map(inDegree);
  const visited = new Set<string>();
  const steps: AnimationStep[] = [];
  let stepIndex = 0;

  // Seed with all zero-in-degree nodes
  let queue: string[] = [];
  for (const [id, deg] of remaining) {
    if (deg === 0) queue.push(id);
  }

  // Process BFS waves. After the initial wave exhausts, break cycles by
  // picking the unvisited node with the lowest remaining in-degree.
  while (visited.size < graph.nodes.size) {
    // If queue is empty, we're stuck on a cycle. Break it.
    if (queue.length === 0) {
      let bestId: string | null = null;
      let bestDeg = Infinity;
      for (const [id] of graph.nodes) {
        if (visited.has(id)) continue;
        const deg = remaining.get(id) ?? Infinity;
        if (deg < bestDeg) {
          bestDeg = deg;
          bestId = id;
        }
      }
      if (bestId === null) break; // all visited
      queue.push(bestId);
    }

    const nextQueue: string[] = [];
    const activateNodes: string[] = [];
    const activateEdges: string[] = [];

    for (const nodeId of queue) {
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      activateNodes.push(nodeId);

      for (const { target, edgeId } of adj.get(nodeId) ?? []) {
        activateEdges.push(edgeId);
        const newDeg = (remaining.get(target) ?? 1) - 1;
        remaining.set(target, newDeg);
        if (newDeg <= 0 && !visited.has(target)) {
          nextQueue.push(target);
        }
      }
    }

    if (activateNodes.length > 0) {
      steps.push({
        id: `step-${stepIndex}`,
        activateNodes,
        activateEdges,
        duration: defaultDuration,
        parallel: activateNodes.length > 1,
      });
      stepIndex++;
    }

    queue = nextQueue;
  }

  return {
    steps,
    defaultDuration,
    title: graph.metadata.title,
  };
}
