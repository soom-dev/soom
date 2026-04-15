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

  // Edge label mapping via data-id attributes.
  // Mermaid v11 uses data-id on both edge paths and edge label groups (e.g. "L_A_B_0").
  var allEdgeLabels = Array.from(svgEl.querySelectorAll('.edgeLabel'));
  var pathToLabelMap = new Map();

  // Build a lookup from data-id to label element
  var labelByDataId = {};
  allEdgeLabels.forEach(function(labelG) {
    var innerLabel = labelG.querySelector('[data-id]');
    var dataId = innerLabel ? innerLabel.getAttribute('data-id') : labelG.getAttribute('data-id');
    if (dataId) labelByDataId[dataId] = labelG;
  });

  // Match each edge path to its label via shared data-id
  svgEl.querySelectorAll('path.flowchart-link, .edgePath path').forEach(function(pathEl) {
    var dataId = pathEl.getAttribute('data-id') || (pathEl.parentElement && pathEl.parentElement.getAttribute('data-id'));
    if (dataId && labelByDataId[dataId]) {
      pathToLabelMap.set(pathEl, labelByDataId[dataId]);
    }
  });`;
}
