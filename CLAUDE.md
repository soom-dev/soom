# CLAUDE.md — Project Instructions

## Project

Hansoom (한숨) — CLI tool that turns Mermaid diagrams into animated, interactive HTML. CLI command is `soom`, npm package is `hansoom`.

**Understand the codebase before making changes:**
```bash
cat package.json                    # scripts, deps, bin config
cat tsconfig.json                   # TypeScript config
cat eslint.config.js                # linter setup (ESLint 10 flat config, NOT .eslintrc)
ls -la src/                         # source structure
ls -la .github/workflows/           # CI pipelines
cat src/graph/types.ts              # core data types everything builds on
cat src/parser/index.ts             # parser interface contract
cat src/commands/render.ts          # render pipeline (Playwright + Mermaid)
cat src/renderer/html.ts            # HTML output template
ls examples/                        # example diagrams organized by category (basic/, microservices/, infrastructure/, pipelines/, ai/)
```

**For Phase 0 history, architecture decisions, and full PR details:**
```bash
cat ~/Documents/ObsidianVault/hansoom/docs/history/phase_0_completion.md
```

**For all technical learnings by topic:**
```bash
ls ~/Documents/ObsidianVault/hansoom/docs/technical_learnings/
```

---

## CI Verification (MANDATORY)

**Every branch MUST have green CI before it is considered complete.** Local passing is not sufficient.

```bash
# After pushing, watch the run
gh run watch

# If it fails, read the logs
gh run list --branch <branch-name> --limit 1
gh run view <run-id> --log-failed

# Fix → commit → push → gh run watch → repeat until ALL jobs green
```

**Do not open or mark a PR as ready until all CI jobs pass. This is not optional.**

---

## Post-Task Requirements

**After every completed branch, do both of the following:**

### 1. Write technical learnings to Obsidian vault

Any bugs encountered, workarounds discovered, tool quirks, environment-specific issues, or non-obvious implementation details MUST be written to:

```
~/Documents/ObsidianVault/hansoom/docs/technical_learnings/
```

Create one file per branch, named after the branch (e.g., `feat-animation-engine.md`). Format:

```markdown
# Learnings: <branch-name>
_PR: <PR number and link>_

## <Topic>
<What happened, why, and the fix. Be specific enough that a future agent can avoid the same mistake.>
```

Organize by topic, not by chronology. If no learnings were generated (everything worked first try), write a file that says so — the absence of a file should never mean "no learnings" because it's ambiguous with "forgot to write learnings."

### 2. Update this CLAUDE.md

After a task is fully verified (CI green, PR merged or ready):

- **Remove the completed task** from the Current Task section
- **Add a summary** to the Completed Work section at the bottom (one-liner: PR reference + what was delivered)
- **Add any new learnings** to the Learnings section
- If the task revealed anything that changes project rules, conventions, or known constraints, **update the relevant section** of this doc

---

## Security Rules

Non-negotiable. CI enforces these automatically.

- **No secrets in source.** Use env vars and `${{ secrets.* }}` in CI. If accidentally committed, scrub from history, not just working tree.
- **No `eval()`, `new Function()`, unsanitized `.innerHTML`, or `exec()` with interpolation.** If truly needed, annotate with `// safe: <reason>` — CI grep skips these.
- **Sanitize all user input.** Mermaid source, file paths, CLI args are untrusted. HTML-entity-escape any user-controlled text before injecting into HTML templates.
- **Every HTML output MUST include a Content-Security-Policy meta tag.** CI verifies this.
- **Never echo or log secret values in CI workflows.**

## Aesthetic Standards (NON-NEGOTIABLE)

The rendered HTML output must be visually indistinguishable from what Mermaid produces in a real browser (e.g., mermaid.live, GitHub Mermaid preview). Specifically:

- **Node labels must be centered inside their boxes.** Not below, not beside, not overflowing.
- **Node boxes must be sized to fit their labels.** Text must never overflow or be clipped.
- **Edge labels must sit on their edges.** Not floating in empty space.
- **Edge arrows must connect to nodes.** Not pointing into empty space or overlapping wrong elements.
- **Subgraphs must render with proper nesting, borders, and titles.**
- **Dark theme must have readable contrast.** Light text on dark nodes, visible edges.
- **Diagrams must fill the viewport appropriately.** No excessive whitespace, responsive scaling.

If the output doesn't look right in a browser, the task is not done. Visual quality is a first-class requirement, not a nice-to-have.

---

## Git Workflow

### Branches
```
<type>/<short-description>
Types: feat/ fix/ chore/ refactor/ docs/ test/
```
All work on feature branches. Never commit directly to `main`.

### Commits
```
<type>(<scope>): <short description>
Scopes: cli, parser, graph, sequencer, renderer, animation, themes, ci, deps
```
Atomic commits — one logical change per commit.

### PRs
- PR title follows conventional commit format
- Squash merge to `main`
- Delete branch after merge

---

## Validation Checklist

Before any branch is complete:

```bash
bun install
bun run lint
bun run format:check
bun test
bun run build
node dist/cli.js render examples/basic/flow-simple.mmd -o /tmp/test.html
bun run dev render examples/basic/flow-simple.mmd -o /tmp/test.html
# Verify self-contained output (should return 0):
grep -cE 'href="https?://|src="https?://' /tmp/test.html
# Verify CSP present:
grep -q "Content-Security-Policy" /tmp/test.html && echo "✓ CSP present"
# Open in browser — diagram must be readable at 100% zoom:
open /tmp/test.html
# Then: push, gh run watch, verify all CI jobs green
```

---


## Current Task

_No active task._

---


## Learnings

_Full learnings archive: `~/Documents/ObsidianVault/hansoom/docs/technical_learnings/`_

### Active learnings (still relevant)

**ESLint 10 uses flat config only.** Must use `eslint.config.js`, not `.eslintrc.json`.

**`bun build` needs `--packages external`.** Without it, jsdom/playwright runtime data files get bundled incorrectly. Always use `--packages external` so deps resolve from `node_modules`.

**Playwright integration pattern.** Read `mermaid.min.js` from node_modules via `createRequire(import.meta.url).resolve('mermaid')`, navigate to `dist/mermaid.min.js`. Launch headless Chromium, `page.addScriptTag()` to inject mermaid, `page.evaluate()` to render, extract SVG string.

**Playwright needs explicit Chromium install.** `bun add playwright` installs the package, not the browser. Run `npx playwright install chromium` locally, `npx playwright install chromium --with-deps` in CI.

**Test timeouts for Playwright.** Each CLI subprocess launches Chromium. Use 60s timeouts for integration tests. `beforeAll` in bun test defaults to 5s — override with `beforeAll(async () => { ... }, 30_000)`.

**CI: TruffleHog needs `fetch-depth: 0`.** Shallow clones can't scan full history.

**CI: Security grep uses FOUND flag pattern.** Don't use `set -e` with multiple greps — first match exits and hides remaining issues. Accumulate with a flag, fail at the end.

**CI: `gh run watch` needs explicit run ID.** Fetch with `gh run list --branch <branch> --limit 1 --json databaseId` first.

**anime.js v4 UMD path resolution.** `require.resolve('animejs')` → `dist/modules/index.cjs`. Go up two dirs to package root, then `dist/bundles/anime.umd.min.js`.

**anime.js v4 API.** Main function is `anime.animate()` not `anime()`. SVG drawables via `anime.svg.createDrawable()`. `.play()` doesn't reliably restart completed loops — create a fresh animation instead.

**SVG stroke animation needs `<path>`, not `<text>`.** `<text>` glyphs are internally discontinuous path segments — stroke-dasharray animation is unreliable. Extract font glyphs to `<path d="...">` with opentype.js.

**CI self-contained check must exclude `<a>` navigation links.** Watermark link to hansoom.dev triggers `href="https?://"` grep. Check `src=` and `<link href=` only.

**Watermark design is taste-dependent — expect iterative tuning.** Final design diverged significantly from original spec through user feedback (fonts, size, position, glow/hover interactions). This is normal for visual features.

**Animation engine: build-time codegen emitting runtime JS.** The engine is TypeScript that generates a JS string at build time, inlined into the HTML. The generated JS uses vanilla DOM + anime.js at runtime. This keeps the build type-safe while producing self-contained output.

**Graph extraction from SVG IDs — don't need the parser.** Mermaid encodes names in SVG element IDs (`flowchart-Name-N`, `L_Source_Target_0`). Regex extraction is sufficient for the sequencer.

**Edge draw: stroke-dashoffset needs getTotalLength() at runtime.** Path lengths aren't available at build time. Set `stroke-dasharray` and `stroke-dashoffset` to `getTotalLength()` at init, animate offset to 0.

**Flow particles on timeline via proxy objects.** `timeline.add({ t: 0 }, { t: [0, 1], onRender ... })` animates a plain JS object. Read `proxy.t` in `onRender` to compute position via `getPointAtLength(proxy.t * len)`. Replaces manual rAF loops — `timeline.pause()` freezes particles automatically.

**timeline.seek() only accepts milliseconds.** Despite labels working in `.add()` offsets, `.seek('step-2')` does NOT work. Use `timeline.seek(timeline.labels['step-2'])` to get the ms value first.

**timeline.call() for state changes, .add() for continuous animation.** Node CSS class toggles (active/completed) work better as `.call()` callbacks. CSS `transition` handles visual smoothing. `.add()` reserved for numeric properties: `strokeDashoffset`, particle position proxies. This keeps theme toggle CSS-driven.

**Persistent animations must live outside the timeline.** Glow pulse and marching dotted lines loop independently and shouldn't rewind on seek. Keep as standalone `anime.animate()` calls, tracked in array for cleanup on loop restart.

**Edge ID matching is fuzzy.** Sequencer uses `edge-0`, SVG uses `L_A_B_0`. The engine resolves via: direct match → source/target substring → index fallback.

**Standard dagre layout is better than ELK for Hansoom.** ELK required 200+ lines of `centerEdgeEndpoints` post-processing to fix port-spreading. Dagre connects edges to node centers naturally, produces smooth bezier curves (better for particle animation), and needs zero post-processing. Don't over-engineer the layout — let mermaid's default do its job.

**Example files must be in git before CI can use them.** Files on disk but not committed cause CI failures. Always verify `git show HEAD:<path>` works for any path referenced in tests.

**Runtime theme toggle: scope CSS under body class.** Inline both `body.soom-dark` and `body.soom-light` CSS sets. Toggle by swapping body class — instant, no re-render. Tests must check body class, not color exclusivity.

**CSS `currentColor` for theme-adaptive glow.** `filter: drop-shadow(0 0 14px currentColor)` on node shapes inherits the stroke color. Pulse animation works across both themes without hardcoded colors.

**Marching dotted lines are zero-cost CSS.** `stroke-dasharray: 4 8; animation: soom-march 0.8s linear infinite` runs on compositor thread. Scales to 20+ edges with no frame drops.

### Archived learnings (jsdom + ELK eras — no longer applies)

jsdom is not viable for Mermaid SVG rendering. After 4 fix PRs polyfilling getBBox, getComputedTextLength, foreignObject dimensions, and viewBox calculations, the output still had interconnected layout bugs. Each fix broke something else. Full details in `~/Documents/ObsidianVault/hansoom/docs/history/phase_0_completion.md`.

---

## Completed Work

### Phase 0 (7 PRs, April 2026)
Project scaffold, CI/CD with security hardening, Mermaid parser, Playwright rendering engine, responsive output. Full details: `~/Documents/ObsidianVault/hansoom/docs/history/phase_0_completion.md`

### Phase 1A Branch 1 — Responsive Scaling + --open Flag
**PR:** `feat/responsive-and-open` → `main` (soom-dev/soom#9)

Delivered: Full-width responsive diagram CSS (removed vertical centering, SVG fills page width with `max-height: 90vh`), `--open` flag for auto-opening in default browser, 5 new tests (27 total).

### Phase 1A Branch 2 — Animated Watermark
**PR:** `feat/watermark` → `main` (soom-dev/soom#10)

Delivered: Animated "hansoom"/"한숨" watermark with anime.js v4 stroke-draw, glow pulse, and hover fill interaction. Paytone One + Gasoek One fonts, 408x61px bottom-center. anime.js inlined, CSP updated. Diagram layout changed to vertically/horizontally centered per user preference. Final design evolved from original spec through iterative user feedback — user confirmed satisfaction with the result.

### Phase 1A Branch 3 — Animation Engine
**PR:** `feat/animation-engine` → `main` (soom-dev/soom#11)

Delivered: Core animation engine — edge draw via stroke-dashoffset, flow particles along SVG paths, node state transitions (inactive/active/completed), annotation panel, step sequencing with onComplete chaining, `window.soomAnimation` API. Reverted ELK to standard dagre layout (cleaner curves, zero post-processing). Reorganized examples into categorized subdirectories. 38 tests total.

### Phase 1A Branch 4 — Visual Overhaul
**PR:** `feat/visual-overhaul` → `main` (soom-dev/soom#12)

Delivered: Theme redesign (dark #362F49/#2FD9D4/#FD58D1, light #F8F6FF/#6C5CE7/#E84393), dotted grid backgrounds, drop shadows on nodes/edges, subgraph hierarchy styling (dashed/dotted borders), runtime dark/light toggle with localStorage persistence, animation looping, marching dotted lines on completed edges, node glow pulse, multi-line annotations with glass effect. 38 tests.

### Phase 1A Branch 5 — Refactor Animation Engine to anime.js Timeline
**PR:** `refactor/animejs-timeline` → `main` (soom-dev/soom#13)

Delivered: Complete engine rewrite from manual callback chains to single anime.js `createTimeline()`. Edge draws + flow particles are timeline segments (pause freezes all), node states via `timeline.call()`. Exposed `soomAnimation.timeline`, `.progress` (0-1), `.playbackRate`. Built-in loop with 3s loopDelay. 45 tests (7 new). Phase 1B playback controls now trivial to wire up.
