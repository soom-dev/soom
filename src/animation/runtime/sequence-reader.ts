export function buildSequenceReaderJs(): string {
  return `
  var seqEl = document.getElementById('soom-sequence');
  if (!seqEl) return;
  var sequence;
  try { sequence = JSON.parse(seqEl.textContent); } catch(e) { return; }
  var steps = sequence.steps || [];
  if (steps.length === 0) return;`;
}
