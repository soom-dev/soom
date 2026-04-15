export function buildEdgeResolverJs(): string {
  return `
  function resolveEdge(eid) {
    if (edgeMap[eid]) return edgeMap[eid];
    var info = EDGE_INFO[eid];
    if (info) {
      var found = findEdgeBySourceTarget(info.source, info.target);
      if (found) return found;
    }
    var idx = parseInt(eid.replace('edge-', ''));
    var keys = Object.keys(edgeMap);
    if (!isNaN(idx) && idx < keys.length) return edgeMap[keys[idx]];
    return null;
  }`;
}
