export function buildSvgDiscoveryJs(): string {
  return `
  var svgEl = document.querySelector('.diagram-container svg');
  if (!svgEl) return;

  var nodeMap = {};
  var edgeMap = {};

  svgEl.querySelectorAll('.node').forEach(function(el) {
    var rawId = el.getAttribute('id') || '';
    var match = rawId.match(/flowchart-(.+?)-\\d+$/);
    var nodeId = match ? match[1] : rawId;
    el.setAttribute('data-node-id', nodeId);
    nodeMap[nodeId] = el;
  });

  function parseEdgeId(rawId) {
    var lIdx = rawId.search(/L[-_]/);
    if (lIdx < 0) return null;
    var body = rawId.slice(lIdx + 1);
    if (body.length < 2) return null;
    var delim = body[0];
    var rest = body.slice(1);
    var knownIds = Object.keys(nodeMap);
    for (var si = 0; si < knownIds.length; si++) {
      var src = knownIds[si];
      if (rest.indexOf(src) !== 0) continue;
      var afterSrc = rest.slice(src.length);
      if (afterSrc.length < 2 || afterSrc[0] !== delim) continue;
      var remaining = afterSrc.slice(1);
      for (var ti = 0; ti < knownIds.length; ti++) {
        var tgt = knownIds[ti];
        if (remaining.indexOf(tgt) !== 0) continue;
        var afterTgt = remaining.slice(tgt.length);
        if (afterTgt.length >= 2 && afterTgt[0] === delim && /^\\d+$/.test(afterTgt.slice(1))) {
          return { source: src, target: tgt };
        }
      }
    }
    return null;
  }

  svgEl.querySelectorAll('path.flowchart-link, .edgePath path').forEach(function(pathEl) {
    var rawId = pathEl.getAttribute('id') || pathEl.parentElement.getAttribute('id') || '';
    var parsed = parseEdgeId(rawId);
    if (!parsed) return;
    var edgeId = 'edge-' + parsed.source + '-' + parsed.target;
    edgeMap[edgeId] = { group: pathEl.parentElement || pathEl, path: pathEl };
  });

  function findEdgeBySourceTarget(source, target) {
    for (var eid in edgeMap) {
      if (eid.indexOf(source) !== -1 && eid.indexOf(target) !== -1) return edgeMap[eid];
    }
    return null;
  }`;
}
