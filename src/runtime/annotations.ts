import { animate, createAnimatable, stagger, text as animeText } from './_anime.js';
import type { AnimationScene, SceneStep } from '../animation/scene/types.js';

const ARROW = '→';
const FADE_DURATION = 200;

export interface AnnotationBindings {
  setStep(step: SceneStep): void;
  setActiveEdges(edgeIds: string[]): void;
  clear(): void;
}

/**
 * Wire up the annotation panel.
 *
 * - `text.split(el, { words: true })` produces a flat span list per call.
 * - `createAnimatable(panel, { opacity })` lets us fade the whole panel in
 *   one call instead of touching each child.
 *
 * Falls back to a no-op binding when the annotation element is absent
 * (e.g. controls disabled in some embed contexts).
 */
export function bindAnnotations(scene: AnimationScene): AnnotationBindings {
  const panel = document.getElementById('soom-annotations');
  if (!panel) {
    return { setStep: noop, setActiveEdges: noop, clear: noop };
  }

  const panelAnim = createAnimatable(panel, {
    opacity: { duration: FADE_DURATION, ease: 'outQuad' },
  });
  let activeWordAnimation: ReturnType<typeof animate> | null = null;

  const writeLines = (lines: string[], parallel: boolean): void => {
    if (activeWordAnimation) {
      activeWordAnimation.pause();
      activeWordAnimation = null;
    }
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    if (lines.length === 0) {
      panelAnim.opacity(0);
      return;
    }
    if (parallel && lines.length > 1) {
      const header = document.createElement('div');
      header.textContent = 'Simultaneously:';
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '4px';
      panel.appendChild(header);
    }
    const lineNodes: HTMLDivElement[] = [];
    for (const line of lines) {
      const div = document.createElement('div');
      div.textContent = line;
      panel.appendChild(div);
      lineNodes.push(div);
    }
    const splits: Element[] = [];
    for (const div of lineNodes) {
      try {
        const result = animeText.splitText(div, { words: true });
        const wordEls = result.words?.elements;
        if (wordEls) {
          for (const w of wordEls) {
            (w as HTMLElement).style.display = 'inline-block';
            (w as HTMLElement).style.opacity = '0';
            splits.push(w);
          }
        }
      } catch {
        // Fallback: manual span-per-word split (e.g. when running in a
        // headless test env where ResizeObserver / doc.fonts are partially
        // stubbed and splitText throws). The visual result is identical.
        const words = (div.textContent ?? '').split(' ');
        div.textContent = '';
        words.forEach((word, idx) => {
          const span = document.createElement('span');
          span.textContent = word + (idx < words.length - 1 ? ' ' : '');
          span.style.display = 'inline-block';
          span.style.opacity = '0';
          div.appendChild(span);
          splits.push(span);
        });
      }
    }
    panelAnim.opacity(1);
    if (splits.length > 0) {
      activeWordAnimation = animate(splits, {
        opacity: [0, 1],
        translateY: ['4px', '0px'],
        duration: FADE_DURATION,
        delay: stagger(35),
        ease: 'outQuad',
      });
    }
  };

  return {
    setStep: (step: SceneStep) => {
      const lines = linesForStep(step, scene);
      writeLines(lines, step.parallel);
    },
    setActiveEdges: (edgeIds: string[]) => {
      const lines: string[] = [];
      for (const eid of edgeIds) {
        const line = lineForEdge(eid, scene);
        if (line) lines.push(line);
      }
      writeLines(lines, false);
    },
    clear: () => writeLines([], false),
  };
}

function linesForStep(step: SceneStep, scene: AnimationScene): string[] {
  const lines: string[] = [];
  if (step.activate.edges.length > 0) {
    for (const eid of step.activate.edges) {
      const line = lineForEdge(eid, scene);
      if (line) lines.push(line);
    }
  }
  if (lines.length === 0) {
    for (const nid of step.activate.nodes) {
      const node = scene.elements.nodes[nid];
      if (node) lines.push(node.label || nid);
    }
  }
  return lines;
}

function lineForEdge(edgeId: string, scene: AnimationScene): string | null {
  const edge = scene.elements.edges[edgeId];
  if (!edge) return null;
  const src = scene.elements.nodes[edge.source]?.label || edge.source;
  const tgt = scene.elements.nodes[edge.target]?.label || edge.target;
  let line = `${src.replace(/\n/g, ' ')} ${ARROW} ${tgt.replace(/\n/g, ' ')}`;
  if (edge.label) line += ` (${edge.label})`;
  return line;
}

function noop(): void {
  /* noop */
}
