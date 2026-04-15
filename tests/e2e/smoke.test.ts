import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const EXAMPLES = [
  { name: 'flow-simple', mmd: 'examples/basic/flow-simple.mmd' },
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
      // Pause the auto-play so tests start from a known state
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
        return {
          currentStep: api.currentStep,
          allDim,
          completedEdges,
          annotText,
        };
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

      // Wait for timeline to complete
      await page.waitForFunction(
        () => {
          const api = (window as any).soomAnimation;
          return api.timeline.completed || api.currentStep === api.totalSteps;
        },
        { timeout: 30_000 },
      );

      // Restore defaults
      await page.evaluate(() => {
        const api = (window as any).soomAnimation;
        api.timeline.loop = true;
        api.setSpeed(1);
        api.pause();
      });

      // jsErrors checked in afterEach
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
      // First go to step 1
      await page.evaluate(() => (window as any).soomAnimation.goToStep(1));
      await page.waitForTimeout(300);

      // Then back to idle
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
      // Wait for RAF to update scrubber
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
