export function buildInitialStateJs(): string {
  return `
  var svgNS = 'http://www.w3.org/2000/svg';

  // Compute marching line pattern from median edge length
  var edgeLens = [];
  Object.keys(edgeMap).forEach(function(eid) {
    var p = edgeMap[eid].path;
    if (p.getTotalLength) edgeLens.push(p.getTotalLength());
  });
  edgeLens.sort(function(a, b) { return a - b; });
  var medianEdgeLen = edgeLens[Math.floor(edgeLens.length / 2)] || 100;
  var marchRepeat = Math.round(medianEdgeLen / 8);
  var marchGap = Math.round(marchRepeat * 3 / 5);
  var marchDash = marchRepeat - marchGap;

  // Edge measurement + marker caching
  var edgeTotalLens = {};
  Object.keys(edgeMap).forEach(function(eid) {
    var p = edgeMap[eid].path;
    var totalLen = p.getTotalLength ? p.getTotalLength() : 300;
    edgeTotalLens[eid] = totalLen;
    p.setAttribute('stroke-dasharray', String(totalLen));
    p._origMarkerEnd = p.getAttribute('marker-end') || '';
    p._origMarkerStart = p.getAttribute('marker-start') || '';
    p.style.markerEnd = 'none';
    p.style.markerStart = 'none';
  });

  // DOM-order edge label mapping
  var allEdgeLabels = Array.from(svgEl.querySelectorAll('.edgeLabel'));
  var edgePaths = svgEl.querySelectorAll('.edgePath');
  var pathToLabelMap = new Map();
  edgePaths.forEach(function(ep, i) {
    if (i < allEdgeLabels.length) {
      var pathEl = ep.querySelector('path');
      if (pathEl) pathToLabelMap.set(pathEl, allEdgeLabels[i]);
    }
  });`;
}
