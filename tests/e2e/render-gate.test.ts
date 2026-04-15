import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

// ── Tier 2: Render gate — every .mmd in examples/ must render + play ───

function findMmdFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findMmdFiles(full));
    } else if (entry.endsWith('.mmd')) {
      results.push(full);
    }
  }
  return results;
}

const allMmdFiles = findMmdFiles('examples');
if (allMmdFiles.length === 0) {
  throw new Error('No .mmd files found in examples/ — render gate cannot run');
}

for (const mmd of allMmdFiles) {
  const name = basename(mmd, '.mmd');
  const html = `/tmp/e2e-gate-${name}.html`;

  test.describe(`render-gate: ${name}`, () => {
    const jsErrors: string[] = [];

    test.beforeAll(() => {
      execSync(`bun run src/cli.ts render ${mmd} -o ${html}`, { stdio: 'pipe' });
    });

    test('renders to HTML without error', () => {
      expect(existsSync(html)).toBe(true);
    });

    test('plays to completion at 4x with zero JS errors', async ({ page }) => {
      jsErrors.length = 0;
      page.on('pageerror', (err) => jsErrors.push(err.message));

      await page.goto(`file://${html}`);

      // Some diagrams produce empty step sequences (no animation API).
      // Wait briefly, then check if soomAnimation exists.
      const hasAnimation = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          let checks = 0;
          const poll = () => {
            if (typeof (window as any).soomAnimation !== 'undefined') return resolve(true);
            if (++checks > 50) return resolve(false); // 5s max
            setTimeout(poll, 100);
          };
          poll();
        });
      });

      if (hasAnimation) {
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
      }
      // Static diagrams (no animation) still pass if there are no JS errors

      expect(jsErrors, `JS errors in ${name}: ${jsErrors.join('; ')}`).toHaveLength(0);
    });
  });
}
