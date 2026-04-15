export function buildAnnotationsJs(): string {
  return `
  var annotEl = document.getElementById('soom-annotations');
  var annotAnim = annotEl ? anime.createAnimatable(annotEl, {
    opacity: { duration: 200, ease: 'outQuad' },
  }) : null;
  var wordAnimation = null;

  function setAnnotation(step) {
    if (!annotEl) return;
    if (wordAnimation) { wordAnimation.pause(); wordAnimation = null; }
    while (annotEl.firstChild) annotEl.removeChild(annotEl.firstChild);
    var texts = [];
    if (step.activateEdges && step.activateEdges.length > 0) {
      step.activateEdges.forEach(function(eid) {
        var info = EDGE_INFO[eid];
        if (info) {
          var srcLabel = (NODE_LABELS[info.source] || info.source).replace(/\\n/g, ' ');
          var tgtLabel = (NODE_LABELS[info.target] || info.target).replace(/\\n/g, ' ');
          var text = srcLabel + ' \\u2192 ' + tgtLabel;
          if (info.label) text += ' (' + info.label + ')';
          texts.push(text);
        }
      });
    }
    if (texts.length === 0 && step.activateNodes && step.activateNodes.length > 0) {
      step.activateNodes.forEach(function(nid) {
        texts.push(NODE_LABELS[nid] || nid);
      });
    }
    if (step.parallel && texts.length > 1) {
      var header = document.createElement('div');
      header.textContent = 'Simultaneously:';
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '4px';
      annotEl.appendChild(header);
    }
    var allSpans = [];
    texts.forEach(function(t) {
      var div = document.createElement('div');
      var words = t.split(' ');
      words.forEach(function(word, wi) {
        var span = document.createElement('span');
        span.textContent = word + (wi < words.length - 1 ? ' ' : '');
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        div.appendChild(span);
        allSpans.push(span);
      });
      annotEl.appendChild(div);
    });
    if (annotAnim) annotAnim.opacity(1);
    if (allSpans.length > 0) {
      wordAnimation = anime.animate(allSpans, {
        opacity: [0, 1],
        translateY: ['4px', '0px'],
        duration: 200,
        delay: anime.stagger(35),
        ease: 'outQuad',
      });
    }
  }

  function setPauseAnnotation(activeEdgeIds) {
    if (!annotEl) return;
    if (wordAnimation) { wordAnimation.pause(); wordAnimation = null; }
    while (annotEl.firstChild) annotEl.removeChild(annotEl.firstChild);
    var texts = [];
    activeEdgeIds.forEach(function(eid) {
      var info = EDGE_INFO[eid];
      if (info) {
        var srcLabel = (NODE_LABELS[info.source] || info.source).replace(/\\n/g, ' ');
        var tgtLabel = (NODE_LABELS[info.target] || info.target).replace(/\\n/g, ' ');
        var text = srcLabel + ' \\u2192 ' + tgtLabel;
        if (info.label) text += ' (' + info.label + ')';
        texts.push(text);
      }
    });
    if (texts.length === 0) return;
    var allSpans = [];
    texts.forEach(function(t) {
      var div = document.createElement('div');
      var words = t.split(' ');
      words.forEach(function(word, wi) {
        var span = document.createElement('span');
        span.textContent = word + (wi < words.length - 1 ? ' ' : '');
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        div.appendChild(span);
        allSpans.push(span);
      });
      annotEl.appendChild(div);
    });
    if (annotAnim) annotAnim.opacity(1);
    if (allSpans.length > 0) {
      wordAnimation = anime.animate(allSpans, {
        opacity: [0, 1], translateY: ['4px', '0px'],
        duration: 200, delay: anime.stagger(35), ease: 'outQuad',
      });
    }
  }`;
}
