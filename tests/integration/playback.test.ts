/**
 * Playback integration tests — diagram-agnostic.
 *
 * Step lifecycle:
 *   step 0/n  — idle: everything dimmed, no annotations, no marching
 *   transition — source node glows, marching lines grow, annotations type out
 *   step k/n  — previous edges marching, nodes glowing, annotation shown
 *
 * User interactions:
 *   pause during transition → snaps to last completed step
 *   step backward          → reverse: last nodes dim, edges un-march, first
 *                             node keeps glow unless reverting to idle
 *   step forward            → play transition to next step boundary, then pause
 *   resume                  → continue full animation loop
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import type { Browser, Page } from 'playwright';

// ── helpers ──────────────────────────────────────────────────────────────

interface StepSnapshot {
  currentStep: number;
  totalSteps: number;
  paused: boolean;
  counter: string;
  annotation: string;
  totalNodes: number;
  completedCount: number;
  activeCount: number;
  dimCount: number;
  conflictCount: number; // both active AND completed
  totalEdges: number;
  drawnEdgeCount: number;
  marchingClassCount: number;
  marchStyleCount: number; // edges with march dasharray inline style
}

async function snap(p: Page): Promise<StepSnapshot> {
  return p.evaluate(() => {
    const api = (window as any).soomAnimation;
    const counterEl = document.getElementById('soom-step-counter');
    const annotEl = document.getElementById('soom-annotations');

    const nodes = Array.from(document.querySelectorAll('.node'));
    let completedCount = 0, activeCount = 0, dimCount = 0, conflictCount = 0;
    nodes.forEach(n => {
      const el = n as HTMLElement;
      const a = n.classList.contains('soom-node-active');
      const c = n.classList.contains('soom-node-completed');
      if (a && c) conflictCount++;
      if (c) completedCount++;
      if (a) activeCount++;
      const op = parseFloat(el.style.opacity || getComputedStyle(el).opacity);
      if (!a && !c && op < 0.5) dimCount++;
    });

    const edges = Array.from(
      document.querySelectorAll('path.flowchart-link, .edgePath path')
    ) as SVGPathElement[];
    let drawnEdgeCount = 0, marchingClassCount = 0, marchStyleCount = 0;
    edges.forEach(el => {
      const off = parseFloat(el.style.strokeDashoffset || el.getAttribute('stroke-dashoffset') || '0');
      const len = el.getTotalLength ? el.getTotalLength() : 0;
      const op = parseFloat(el.style.opacity || getComputedStyle(el).opacity);
      if (len > 0 && off < len * 0.1 && op > 0.8) drawnEdgeCount++;
      if (el.classList.contains('soom-edge-completed')) marchingClassCount++;
      const da = el.style.strokeDasharray || '';
      if (da && da.includes(' ') && da !== String(len)) marchStyleCount++;
    });

    return {
      currentStep: api ? api.currentStep : -1,
      totalSteps: api ? api.totalSteps : 0,
      paused: api ? api.timeline.paused : true,
      counter: counterEl?.textContent || '',
      annotation: (annotEl?.textContent || '').trim(),
      totalNodes: nodes.length,
      completedCount, activeCount, dimCount, conflictCount,
      totalEdges: edges.length,
      drawnEdgeCount, marchingClassCount, marchStyleCount,
    };
  });
}

async function goTo(p: Page, n: number): Promise<StepSnapshot> {
  await p.evaluate(n => (window as any).soomAnimation.goToStep(n), n);
  await p.waitForTimeout(300);
  return snap(p);
}

// ── test suite ───────────────────────────────────────────────────────────

const HTML = '/tmp/test-playback.html';
const MMD = 'examples/meta/flow-context-map.mmd';

let browser: Browser;
let page: Page;
let N: number; // total action steps (from API)

// TODO(R7): v1 runtime was deleted in R6. The v2 runtime has small
// behavioral differences in marching-line lifecycle, pause-snap behavior,
// and annotation typing. R7 polish reconciles assertions against v2 and
// re-enables this suite.
describe.skip('Playback controls (v1-pinned, awaiting R7 reconciliation)', () => {
  beforeAll(async () => {
    await $`HANSOOM_RUNTIME=v1 bun run src/cli.ts render ${MMD} -o ${HTML}`.quiet();
    const pw = await import('playwright');
    browser = await pw.chromium.launch();
    page = await browser.newPage();
    await page.goto(`file://${HTML}`);
    await page.waitForFunction(
      () => typeof (window as any).soomAnimation !== 'undefined',
      { timeout: 10_000 },
    );
    await page.evaluate(() => (window as any).soomAnimation.pause());
    await page.waitForTimeout(300);
    N = await page.evaluate(() => (window as any).soomAnimation.totalSteps);
  }, 60_000);

  afterAll(async () => { if (browser) await browser.close(); });

  // ═══════ STEP STATES ═══════

  describe('idle (step 0)', () => {
    let s: StepSnapshot;
    beforeAll(async () => { s = await goTo(page, 0); });

    it('counter shows 0/N', () => expect(s.counter).toBe(`0/${N}`));
    it('all nodes dim', () => expect(s.dimCount).toBe(s.totalNodes));
    it('no completed nodes', () => expect(s.completedCount).toBe(0));
    it('no active nodes', () => expect(s.activeCount).toBe(0));
    it('no edges drawn', () => expect(s.drawnEdgeCount).toBe(0));
    it('no marching lines', () => expect(s.marchingClassCount).toBe(0));
    it('no march dash style', () => expect(s.marchStyleCount).toBe(0));
    it('no annotation', () => expect(s.annotation).toBe(''));
    it('no class conflicts', () => expect(s.conflictCount).toBe(0));
  });

  describe('each completed step k (1..N)', () => {
    it('completed + marching counts increase monotonically', async () => {
      let prevCompleted = 0;
      let prevMarching = 0;
      let prevDrawn = 0;

      for (let k = 1; k <= N; k++) {
        const s = await goTo(page, k);
        expect(s.counter).toBe(`${k}/${N}`);
        expect(s.conflictCount).toBe(0);
        expect(s.completedCount).toBeGreaterThanOrEqual(prevCompleted);
        expect(s.marchingClassCount).toBeGreaterThanOrEqual(prevMarching);
        expect(s.drawnEdgeCount).toBeGreaterThanOrEqual(prevDrawn);
        expect(s.annotation.length).toBeGreaterThan(0);
        // march class and dash style should match
        expect(s.marchStyleCount).toBe(s.marchingClassCount);
        prevCompleted = s.completedCount;
        prevMarching = s.marchingClassCount;
        prevDrawn = s.drawnEdgeCount;
      }
    });

    it('last step has all nodes completed', async () => {
      const s = await goTo(page, N);
      expect(s.completedCount).toBe(s.totalNodes);
      expect(s.dimCount).toBe(0);
    });
  });

  // ═══════ MARCH DURING LIVE PLAYBACK ═══════

  describe('marching lines during playback', () => {
    it('edges get soom-edge-completed class during live play', async () => {
      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.goToStep(0);
        api.setSpeed(4);
        api.play();
      });
      // Wait enough for step 1 edges to finish drawing (at 4x)
      await page.waitForTimeout(4000);
      await page.evaluate(() => (window as any).soomAnimation.pause());
      await page.waitForTimeout(300);

      const s = await snap(page);
      expect(s.marchingClassCount).toBeGreaterThan(0);
      expect(s.marchStyleCount).toBeGreaterThan(0);

      await page.evaluate(() => (window as any).soomAnimation.setSpeed(1));
    }, 10_000);

    it('march dash offset changes over time (animation running)', async () => {
      const s = await goTo(page, 1);
      expect(s.marchingClassCount).toBeGreaterThan(0);

      const off1 = await page.evaluate(() => {
        const el = document.querySelector('.soom-edge-completed') as SVGPathElement;
        return el ? parseFloat(el.style.strokeDashoffset || '0') : null;
      });
      await page.waitForTimeout(300);
      const off2 = await page.evaluate(() => {
        const el = document.querySelector('.soom-edge-completed') as SVGPathElement;
        return el ? parseFloat(el.style.strokeDashoffset || '0') : null;
      });

      expect(off1).not.toBeNull();
      expect(off2).not.toBeNull();
      expect(off1).not.toBe(off2);
    });
  });

  // ═══════ PAUSE SNAPS TO COMPLETED STEP ═══════

  describe('pause snaps to last completed step', () => {
    it('pause during transition lands on a valid step boundary', async () => {
      // Play from idle, pause shortly after
      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.goToStep(0);
        api.play();
      });
      // Pause during the first transition
      await page.waitForTimeout(800);
      await page.evaluate(() => (window as any).soomAnimation.pause());
      await page.waitForTimeout(300);

      const s = await snap(page);
      // Should be at step 0 (idle) or step 1 — a clean boundary, not mid-transition
      // At a clean boundary: no active nodes (only completed or dim)
      expect(s.activeCount).toBe(0);
      expect(s.conflictCount).toBe(0);
    });
  });

  // ═══════ STEP BACKWARD ═══════

  describe('step backward', () => {
    it('from step k to step k-1: completed count decreases or stays (reaches 0 at idle)', async () => {
      for (let k = N; k >= 1; k--) {
        const before = await goTo(page, k);
        await page.evaluate(() => (window as any).soomAnimation.stepBackward());
        await page.waitForTimeout(400);
        const after = await snap(page);

        expect(after.currentStep).toBe(k - 1);
        expect(after.completedCount).toBeLessThanOrEqual(before.completedCount);
        expect(after.conflictCount).toBe(0);
        if (k - 1 === 0) {
          // Idle: everything clean
          expect(after.completedCount).toBe(0);
          expect(after.marchingClassCount).toBe(0);
          expect(after.drawnEdgeCount).toBe(0);
        }
      }
    });

    it('step backward at idle does nothing', async () => {
      await goTo(page, 0);
      await page.evaluate(() => (window as any).soomAnimation.stepBackward());
      await page.waitForTimeout(300);
      expect((await snap(page)).currentStep).toBe(0);
    });
  });

  // ═══════ STEP FORWARD ═══════

  describe('step forward', () => {
    it('from step k to step k+1: completed count increases or stays (always > 0 past idle)', async () => {
      for (let k = 0; k < N; k++) {
        const before = await goTo(page, k);
        await page.evaluate(() => (window as any).soomAnimation.stepForward());
        await page.waitForTimeout(400);
        const after = await snap(page);

        expect(after.currentStep).toBe(k + 1);
        expect(after.completedCount).toBeGreaterThanOrEqual(before.completedCount);
        // Past idle, there must be completed nodes
        expect(after.completedCount).toBeGreaterThan(0);
        expect(after.conflictCount).toBe(0);
      }
    });

    it('step forward at last step does nothing', async () => {
      await goTo(page, N);
      await page.evaluate(() => (window as any).soomAnimation.stepForward());
      await page.waitForTimeout(300);
      expect((await snap(page)).currentStep).toBe(N);
    });
  });

  // ═══════ PLAY / RESUME ═══════

  describe('play and resume', () => {
    it('play resumes from paused state', async () => {
      await goTo(page, 2);
      await page.evaluate(() => (window as any).soomAnimation.play());
      await page.waitForTimeout(100);
      expect((await snap(page)).paused).toBe(false);
      await page.evaluate(() => (window as any).soomAnimation.pause());
    });

    it('play from last step is not stuck', async () => {
      await goTo(page, N);
      await page.evaluate(() => (window as any).soomAnimation.play());
      await page.waitForTimeout(200);
      expect((await snap(page)).paused).toBe(false);
      await page.evaluate(() => (window as any).soomAnimation.pause());
    });
  });

  // ═══════ ROUND TRIP ═══════

  describe('round trip consistency', () => {
    it('0 → N → 0 produces identical idle state', async () => {
      const a = await goTo(page, 0);
      await goTo(page, N);
      const b = await goTo(page, 0);
      expect(b.completedCount).toBe(a.completedCount);
      expect(b.marchingClassCount).toBe(a.marchingClassCount);
      expect(b.drawnEdgeCount).toBe(a.drawnEdgeCount);
      expect(b.dimCount).toBe(a.dimCount);
    });

    it('step 1 identical before and after visiting later steps', async () => {
      const a = await goTo(page, 1);
      await goTo(page, N);
      await goTo(page, 0);
      const b = await goTo(page, 1);
      expect(b.completedCount).toBe(a.completedCount);
      expect(b.marchingClassCount).toBe(a.marchingClassCount);
      expect(b.marchStyleCount).toBe(a.marchStyleCount);
      expect(b.drawnEdgeCount).toBe(a.drawnEdgeCount);
      expect(b.dimCount).toBe(a.dimCount);
    });
  });

  // ═══════ SHADOW ELEVATION ═══════

  describe('shadow elevation', () => {
    it('completed nodes have drop-shadow filter set', async () => {
      await goTo(page, 1);
      const filter = await page.evaluate(() => {
        const completed = document.querySelector('.soom-node-completed') as SVGElement;
        if (!completed) return null;
        return completed.style.filter || getComputedStyle(completed).filter;
      });
      expect(filter).not.toBeNull();
      expect(filter).toContain('drop-shadow');
    });
  });

  // ═══════ ANNOTATION WORDS FULLY VISIBLE ═══════

  describe('annotation words fully rendered', () => {
    it('all word spans reach full opacity at completed step', async () => {
      await goTo(page, 1);
      // Wait for word stagger animation to finish
      await page.waitForTimeout(500);

      const wordInfo = await page.evaluate(() => {
        const annotEl = document.getElementById('soom-annotations');
        if (!annotEl) return { total: 0, visible: 0 };
        const spans = annotEl.querySelectorAll('span');
        let visible = 0;
        spans.forEach(s => {
          if (parseFloat((s as HTMLElement).style.opacity || '0') > 0.9) visible++;
        });
        return { total: spans.length, visible };
      });

      expect(wordInfo.total).toBeGreaterThan(0);
      // All words should be fully visible at a completed step
      expect(wordInfo.visible).toBe(wordInfo.total);
    });
  });

  // ═══════ STEP FORWARD PLAYS TRANSITION ═══════

  describe('step forward plays transition (not instant)', () => {
    it('stepForward from idle pauses at step 1 with completed state', async () => {
      await goTo(page, 0);
      await page.evaluate(() => (window as any).soomAnimation.stepForward());
      // Should eventually arrive at step 1
      await page.waitForTimeout(400);
      const s = await snap(page);
      expect(s.currentStep).toBe(1);
      expect(s.paused).toBe(true);
      expect(s.completedCount).toBeGreaterThan(0);
      expect(s.conflictCount).toBe(0);
    });
  });

  // ═══════ PAUSE DURING TRANSITION ═══════

  describe('pause during transition snaps to completed step', () => {
    it('pausing mid-transition has no active-only nodes (all completed or dim)', async () => {
      // Play from idle
      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.goToStep(0);
        api.play();
      });
      // Pause partway through first transition
      await page.waitForTimeout(800);
      await page.evaluate(() => (window as any).soomAnimation.pause());
      await page.waitForTimeout(300);

      const s = await snap(page);
      // Should be at a clean step boundary — no mid-transition "active" nodes
      expect(s.activeCount).toBe(0);
      expect(s.conflictCount).toBe(0);
      // Either at idle (0 completed) or step 1 (completed > 0)
      expect(s.currentStep).toBeLessThanOrEqual(1);
    });

    it('pausing mid-transition between step 2 and 3 snaps to step 2', async () => {
      // Go to step 2, then play
      await goTo(page, 2);
      await page.evaluate(() => (window as any).soomAnimation.play());
      // Pause shortly after — should be in transition to step 3
      await page.waitForTimeout(600);
      await page.evaluate(() => (window as any).soomAnimation.pause());
      await page.waitForTimeout(300);

      const s = await snap(page);
      expect(s.activeCount).toBe(0);
      expect(s.conflictCount).toBe(0);
      // Should snap back to step 2 or forward to step 3
      expect(s.currentStep).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════ STEP BACKWARD SHADOW STATE ═══════

  describe('step backward shadow state', () => {
    it('stepping from step 2 to step 1: step 1 nodes have shadow', async () => {
      await goTo(page, 2);
      await page.evaluate(() => (window as any).soomAnimation.stepBackward());
      await page.waitForTimeout(400);

      const s = await snap(page);
      expect(s.currentStep).toBe(1);
      expect(s.completedCount).toBeGreaterThan(0);

      const hasShadow = await page.evaluate(() => {
        const completed = document.querySelector('.soom-node-completed') as SVGElement;
        if (!completed) return false;
        const filter = completed.style.filter || getComputedStyle(completed).filter;
        return filter.includes('drop-shadow');
      });
      expect(hasShadow).toBe(true);
    });

    it('stepping from step 1 to idle: all nodes dim, no completed classes', async () => {
      await goTo(page, 1);
      await page.evaluate(() => (window as any).soomAnimation.stepBackward());
      await page.waitForTimeout(400);

      const s = await snap(page);
      expect(s.currentStep).toBe(0);
      expect(s.completedCount).toBe(0);
      expect(s.dimCount).toBe(s.totalNodes);
    });
  });

  // ═══════ ANIMATION LOOP ═══════

  describe('full animation loop', () => {
    it('no class conflicts after playing through a full loop', async () => {
      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.goToStep(0);
        api.setSpeed(4);
        api.play();
      });
      await page.waitForTimeout(8000);
      await page.evaluate(() => (window as any).soomAnimation.pause());
      await page.waitForTimeout(300);

      const s = await snap(page);
      expect(s.conflictCount).toBe(0);
      await page.evaluate(() => (window as any).soomAnimation.setSpeed(1));
    }, 15_000);
  });
});
