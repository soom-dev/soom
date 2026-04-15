import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// ── Tier 1: Full behavioral tests ──────────────────────────────────────

const EXAMPLES = [
  { name: 'flow-simple', mmd: 'examples/basic/flow-simple.mmd' },
  { name: 'flow-branching', mmd: 'examples/basic/flow-branching.mmd' },
  { name: 'flow-microservice', mmd: 'examples/basic/flow-microservice.mmd' },
];

for (const { name, mmd } of EXAMPLES) {
  const html = `/tmp/e2e-${name}.html`;

  test.describe(name, () => {
    const jsErrors: string[] = [];

    test.beforeAll(() => {
      execSync(`bun run src/cli.ts render ${mmd} -o ${html}`, { stdio: 'pipe' });
      if (!existsSync(html)) throw new Error(`render failed: ${html} not found`);
    });

    test.beforeEach(async ({ page }) => {
      jsErrors.length = 0;
      page.on('pageerror', (err) => jsErrors.push(err.message));
      await page.goto(`file://${html}`);
      await page.waitForFunction(
        () => typeof (window as any).soomAnimation !== 'undefined',
        { timeout: 10_000 },
      );
      await page.evaluate(() => (window as any).soomAnimation.pause());
      await page.waitForTimeout(300);
    });

    test.afterEach(() => {
      expect(jsErrors, `JS errors detected: ${jsErrors.join('; ')}`).toHaveLength(0);
    });

    test('idle state (step 0): nodes dim, no completed edges, annotation empty', async ({ page }) => {
      await page.evaluate(() => (window as any).soomAnimation.goToStep(0));
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        const nodes = Array.from(document.querySelectorAll('.node'));
        const allDim = nodes.every((n) => {
          const op = parseFloat((n as HTMLElement).style.opacity || getComputedStyle(n as Element).opacity);
          return op <= 0.5;
        });
        const completedEdges = document.querySelectorAll('.soom-edge-completed').length;
        const annotEl = document.getElementById('soom-annotations');
        const annotText = (annotEl?.textContent || '').trim();
        return { currentStep: api.currentStep, allDim, completedEdges, annotText };
      });

      expect(state.currentStep).toBe(0);
      expect(state.allDim).toBe(true);
      expect(state.completedEdges).toBe(0);
      expect(state.annotText).toBe('');
    });

    test('play to completion: no JS errors', async ({ page }) => {
      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.goToStep(0);
        api.setSpeed(4);
        api.timeline.loop = false;
        api.play();
      });

      await page.waitForFunction(
        () => {
          const api = (window as any).soomAnimation;
          return api.timeline.completed || api.currentStep === api.totalSteps;
        },
        { timeout: 30_000 },
      );

      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.timeline.loop = true;
        api.setSpeed(1);
        api.pause();
      });
    });

    test('step-through: goToStep(1) activates nodes and edges', async ({ page }) => {
      await page.evaluate(() => (window as any).soomAnimation.goToStep(1));
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        const completedNodes = document.querySelectorAll('.soom-node-completed').length;
        const completedEdges = document.querySelectorAll('.soom-edge-completed').length;
        const annotEl = document.getElementById('soom-annotations');
        const annotText = (annotEl?.textContent || '').trim();
        return {
          currentStep: api.currentStep,
          totalSteps: api.totalSteps,
          completedNodes,
          completedEdges,
          annotText,
        };
      });

      expect(state.currentStep).toBeGreaterThanOrEqual(1);
      expect(state.currentStep).toBeLessThanOrEqual(state.totalSteps);
      expect(state.completedNodes).toBeGreaterThan(0);
      expect(state.completedEdges).toBeGreaterThan(0);
      expect(state.annotText.length).toBeGreaterThan(0);
    });

    test('seek backward: goToStep(0) restores idle state', async ({ page }) => {
      await page.evaluate(() => (window as any).soomAnimation.goToStep(1));
      await page.waitForTimeout(300);
      await page.evaluate(() => (window as any).soomAnimation.goToStep(0));
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const completedNodes = document.querySelectorAll('.soom-node-completed').length;
        const completedEdges = document.querySelectorAll('.soom-edge-completed').length;
        const annotEl = document.getElementById('soom-annotations');
        const annotText = (annotEl?.textContent || '').trim();
        return { completedNodes, completedEdges, annotText };
      });

      expect(state.completedNodes).toBe(0);
      expect(state.completedEdges).toBe(0);
      expect(state.annotText).toBe('');
    });

    test('pause during playback: currentStep is stable', async ({ page }) => {
      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.goToStep(0);
        api.play();
      });
      await page.waitForTimeout(500);
      await page.evaluate(() => (window as any).soomAnimation.pause());
      await page.waitForTimeout(200);

      const step1 = await page.evaluate(() => (window as any).soomAnimation.currentStep);
      await page.waitForTimeout(200);
      const step2 = await page.evaluate(() => (window as any).soomAnimation.currentStep);

      expect(step1).toBe(step2);
    });

    test('scrubber sync: after goToStep(n), scrubber value matches currentStep', async ({ page }) => {
      await page.evaluate(() => (window as any).soomAnimation.goToStep(1));
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        const scrubber = document.getElementById('soom-scrubber') as HTMLInputElement | null;
        return {
          currentStep: api.currentStep,
          scrubberValue: scrubber ? parseInt(scrubber.value, 10) : -1,
        };
      });

      expect(state.scrubberValue).toBe(state.currentStep);
    });
  });
}

// ── Kitchen-sink stress tests ───────────────────────────────────────────

test.describe('kitchen-sink', () => {
  const html = '/tmp/e2e-kitchen-sink.html';
  const mmd = 'examples/stress/kitchen-sink.mmd';
  const jsErrors: string[] = [];

  test.beforeAll(() => {
    execSync(`bun run src/cli.ts render ${mmd} -o ${html}`, { stdio: 'pipe' });
    if (!existsSync(html)) throw new Error(`render failed: ${html} not found`);
  });

  test.beforeEach(async ({ page }) => {
    jsErrors.length = 0;
    page.on('pageerror', (err) => jsErrors.push(err.message));
    await page.goto(`file://${html}`);
    await page.waitForFunction(
      () => typeof (window as any).soomAnimation !== 'undefined',
      { timeout: 15_000 },
    );
    await page.evaluate(() => (window as any).soomAnimation.pause());
    await page.waitForTimeout(300);
  });

  test.afterEach(() => {
    expect(jsErrors, `JS errors detected: ${jsErrors.join('; ')}`).toHaveLength(0);
  });

  test('totalSteps >= 10 (no step collapse)', async ({ page }) => {
    const totalSteps = await page.evaluate(() => (window as any).soomAnimation.totalSteps);
    expect(totalSteps).toBeGreaterThanOrEqual(10);
  });

  test('node count: >= 13 standalone shapes', async ({ page }) => {
    const nodeCount = await page.evaluate(() => document.querySelectorAll('.node').length);
    expect(nodeCount).toBeGreaterThanOrEqual(13);
  });

  test('subgraph nesting: at least 3 cluster elements', async ({ page }) => {
    const clusterCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[class*="cluster"]')).length;
    });
    expect(clusterCount).toBeGreaterThanOrEqual(3);
  });

  test('edge labels present in rendered HTML', () => {
    const content = readFileSync(html, 'utf-8');
    expect(content).toContain('HTTPS');
    expect(content).toContain('Validate JWT');
    expect(content).toContain('Publish Event');
  });

  test('styled nodes: at least 1 node with custom fill', async ({ page }) => {
    const styledCount = await page.evaluate(() => {
      // Mermaid applies classDef fills via inline style (fill: #hex !important), not fill attribute
      const shapes = document.querySelectorAll('.node rect, .node polygon, .node circle, .node path');
      let count = 0;
      const customFills = ['#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
      shapes.forEach((el) => {
        const style = (el as SVGElement).getAttribute('style') || '';
        if (customFills.some((c) => style.toLowerCase().includes(c))) count++;
      });
      return count;
    });
    expect(styledCount).toBeGreaterThanOrEqual(1);
  });

  test('cross-subgraph completion: monitoring + cloud have completed nodes after playback', async ({ page }) => {
    await page.evaluate(() => {
      const api = (window as any).soomAnimation;
      api.setSpeed(4);
      api.timeline.loop = false;
      api.play();
    });

    await page.waitForFunction(
      () => {
        const api = (window as any).soomAnimation;
        return api.timeline.completed || api.currentStep === api.totalSteps;
      },
      { timeout: 30_000 },
    );

    const completed = await page.evaluate(() => {
      const allCompleted = document.querySelectorAll('.soom-node-completed');
      const completedIds = Array.from(allCompleted).map(
        (el) => el.getAttribute('data-node-id') || el.getAttribute('id') || '',
      );
      // Check for nodes that belong to different subgraphs
      const hasCloudNode = completedIds.some(
        (id) => /CDN|WAF|LB|API_GW|AUTH_SVC|USER_SVC|ORDER_SVC|PG_PRIMARY|REDIS|KAFKA/.test(id),
      );
      const hasMonitoringNode = completedIds.some(
        (id) => /PROM|GRAFANA|LOKI|JAEGER/.test(id),
      );
      return { total: allCompleted.length, hasCloudNode, hasMonitoringNode };
    });

    expect(completed.total).toBeGreaterThan(0);
    expect(completed.hasCloudNode).toBe(true);
    expect(completed.hasMonitoringNode).toBe(true);

    await page.evaluate(() => {
      const api = (window as any).soomAnimation;
      api.timeline.loop = true;
      api.setSpeed(1);
      api.pause();
    });
  });

  test('cycle handling: play-to-completion finishes within 30s at 4x', async ({ page }) => {
    await page.evaluate(() => {
      const api = (window as any).soomAnimation;
      api.goToStep(0);
      api.setSpeed(4);
      api.timeline.loop = false;
      api.play();
    });

    // This will timeout (fail) if the engine loops infinitely on cycles
    await page.waitForFunction(
      () => {
        const api = (window as any).soomAnimation;
        return api.timeline.completed || api.currentStep === api.totalSteps;
      },
      { timeout: 30_000 },
    );

    await page.evaluate(() => {
      const api = (window as any).soomAnimation;
      api.timeline.loop = true;
      api.setSpeed(1);
      api.pause();
    });
  });

  test('decision fan-out: diamond step activates >= 2 edges', async ({ page }) => {
    const totalSteps = await page.evaluate(() => (window as any).soomAnimation.totalSteps);

    // Walk through steps looking for one where >= 2 edges activate simultaneously
    let foundFanOut = false;
    for (let step = 1; step <= totalSteps; step++) {
      await page.evaluate((n) => (window as any).soomAnimation.goToStep(n), step);
      await page.waitForTimeout(200);

      const prev = step > 1
        ? await page.evaluate((n) => {
            (window as any).soomAnimation.goToStep(n);
            return document.querySelectorAll('.soom-edge-completed').length;
          }, step - 1)
        : 0;

      await page.evaluate((n) => (window as any).soomAnimation.goToStep(n), step);
      await page.waitForTimeout(200);
      const curr = await page.evaluate(() => document.querySelectorAll('.soom-edge-completed').length);

      if (curr - prev >= 2) {
        foundFanOut = true;
        break;
      }
    }

    expect(foundFanOut).toBe(true);
  });
});
