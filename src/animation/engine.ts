import type { AnimationSequence, AnimaGraph } from '../types.js';
import { extractAnimationData } from './data.js';
import { buildSvgDiscoveryJs } from './runtime/svg-discovery.js';
import { buildSequenceReaderJs } from './runtime/sequence-reader.js';
import { buildAnnotationsJs } from './runtime/annotations.js';
import { buildEdgeResolverJs } from './runtime/edge-resolver.js';
import { buildInitialStateJs } from './runtime/initial-state.js';
import { buildPersistentEffectsJs } from './runtime/persistent-effects.js';
import { buildTimelineJs } from './runtime/timeline-builder.js';
import { buildPlaybackApiJs } from './runtime/playback-api.js';

export function generateAnimationScript(_sequence: AnimationSequence, _graph: AnimaGraph): string {
  const data = extractAnimationData(_graph);

  return `
(function() {
  'use strict';

  var NODE_LABELS = ${JSON.stringify(data.nodeLabels)};
  var EDGE_INFO = ${JSON.stringify(data.edgeInfo)};
${buildSvgDiscoveryJs()}
${buildSequenceReaderJs()}
${buildAnnotationsJs()}
${buildEdgeResolverJs()}
${buildInitialStateJs()}
${buildPersistentEffectsJs()}
${buildTimelineJs()}
${buildPlaybackApiJs()}
})();`;
}
