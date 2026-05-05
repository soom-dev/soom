# AGENTS.md — Hansoom (한숨)

Guidance for AI coding agents (Cursor, Aider, Codex, Gemini CLI, Claude Code, etc.) working in this repository. Read after `README.md`. For human contributor process, read `CONTRIBUTING.md`. For current project state, read `STATE.md`.

## What

Hansoom is a TypeScript CLI that compiles Mermaid diagrams (`.mmd`) into self-contained, animated, interactive HTML. The CLI command is `soom`; the npm package is `hansoom`. Output is a single `.html` file with embedded SVG, CSS, and JS — strict CSP, no `eval`, no external runtime dependencies.

- **Runtime:** Bun ≥ 1.0 (also Node ≥ 18 compatible).
- **Language:** TypeScript 5.
- **Tests:** `bun test` for unit/integration; Playwright for end-to-end (`bun run test:e2e`).
- **Build:** `bun build` produces `dist/cli.js` and a separate IIFE-format runtime bundle at `dist-runtime/runtime.js`.
- **License:** Apache 2.0.

## Why (architecture in one screen)

The pipeline is: **parse Mermaid → produce a typed `AnimationScene` IR → emit HTML that loads a bundled TS runtime which animates the SVG via anime.js v4**.

Three pieces are non-obvious and bite contributors who don't know about them:

1. **The runtime is a separately-bundled IIFE.** `src/runtime/` builds to `dist-runtime/runtime.js` via `bun build` with `format: 'iife'`. ESM is wrong here — the bundle is loaded via classic `<script>` in the generated HTML, and `<script type="module">` defers and would race the classic scripts that follow it. Don't change the format.
2. **The Scene IR (`src/animation/scene/types.ts`) is the build-side ↔ runtime-side contract.** Both producers (build) and consumers (runtime) depend on the same type. Adding a primitive (e.g., a new step kind) means extending the IR types **first**, then both sides — never just one.
3. **anime.js comes through `src/runtime/_anime.ts`**, which destructures from `globalThis.anime` (set by `src/output/anime-loader.ts`). This shim keeps the runtime bundle ~10 KB; importing `'animejs'` directly anywhere else re-inlines the library and pushes the bundle past 50 KB. Outside `src/runtime/`, anime.js imports must be type-only: `import type * as Anime from 'animejs'`.

The seven-phase Animation Runtime Refactor (PRs #31–#38, complete 2026-05-03) replaced an older template-string codegen with the IR + runtime architecture above. `STATE.md` carries the current focus and the most recent decisions.

## How (commands an agent should run)

```bash
bun install
bun run lint           # ESLint
bun run format:check   # Prettier (use `bun run format` to fix)
bun run typecheck      # tsc --noEmit  (CI gate; treat tsc errors like runtime exceptions)
bun test               # unit + integration
bun run test:e2e       # Playwright (slower; not run on every change)
bun run build          # CLI + runtime bundles
```

End-to-end smoke test of a real render:

```bash
node dist/cli.js render examples/basic/flow-simple.mmd -o /tmp/test.html
grep -q "Content-Security-Policy" /tmp/test.html && echo "✓ CSP"
```

Before declaring a task done: `bun run lint && bun run format:check && bun run typecheck && bun test && bun run build` must all pass.

## Repo map

```
src/
├── cli.ts              # commander entry — `soom` command + flags
├── pipeline.ts         # top-level pipeline: file → SVG → HTML
├── types.ts            # shared cross-module types (NodeType, EdgeStyle, SourceFormat)
├── constants.ts        # shared timing, z-index, layout — single source of truth
├── render/             # Playwright headless Chromium that invokes Mermaid (renderMermaidToSvg in playwright.ts), post-processes SVG, extracts the graph
├── animation/
│   └── scene/          # Scene IR (types.ts) + builder (build.ts) + edge-path measurements — the build/runtime contract
├── sequencer/          # step ordering, topological sort
├── runtime/            # bundled TS runtime (loaded by generated HTML)
│   ├── index.ts        # bootRuntime(scene) entry
│   ├── timeline.ts     # anime.js v4 timeline + per-step drawables
│   ├── _anime.ts       # globalThis.anime shim — DO NOT bypass
│   ├── api.ts          # `soomAnimation` global the playback controls poll
│   ├── elements.ts     # node/edge SVG element handles
│   ├── annotations.ts  # step annotation panel (currently disabled — see design notes)
│   ├── particles.ts    # edge-flow particle effects
│   └── persistent.ts   # marching-line + completed-edge state
├── output/             # HTML/CSS/JS templates + anime.js loader + runtime bundle loader
├── themes/             # dark + light theme CSS (theme tokens drive runtime CSS variables)
├── watermark/          # branded SVG wordmark
└── utils/              # browser open helper, etc.
tests/                  # bun test files
e2e/                    # Playwright tests
examples/               # sample .mmd files used by tests + manual checks
```

There is no separate `src/parser/`. Mermaid is invoked from `src/render/playwright.ts` via `renderMermaidToSvg(source, theme)` — Playwright loads Mermaid in a headless browser, runs it against the source, and returns the rendered SVG.

## Conventions

- **Strict TypeScript.** `bun run typecheck` runs in CI as of PR #38. Three "harmless" tsc errors had been masking two latent runtime bugs — treat tsc errors like runtime exceptions, don't paper over with `as any` or `// @ts-ignore`.
- **anime.js v4, named exports only.** `import { animate, createTimeline, stagger, eases, utils } from 'animejs'`. The default `anime` import does not exist in v4. `easing:` is now `ease:`; named easings dropped the `ease` prefix (`easeOutQuad` → `outQuad`); `anime.timeline()` is `createTimeline()`; `anime.stagger()` is the named `stagger()`. Migration guide: https://github.com/juliangarnier/anime/wiki/Migrating-from-v3-to-v4.
- **Constants live in `src/constants.ts`** — shared timing, z-index, layout values. Don't hardcode magic values in component files.
- **Format/lint runs before commit.** `bun run format && bun run lint`. CI enforces `format:check`.
- **Branch + commit naming:** see `CONTRIBUTING.md`. Squash-merge to `main`.
- **No AI attribution in commits or PRs.** No `🤖 Generated with...` trailers, no `Co-Authored-By: Claude/Cursor/Aider/etc.` lines, no tool-attribution footers. PR descriptions end where the technical content ends. This applies regardless of which AI tool you're using.
- **Optimization estimates require measurement.** Generic "this saves X seconds" rules misapply on a <3k LOC codebase. Before proposing any performance or CI optimization, run a real measurement against the actual code; if projected savings are <5% of total CI time or <30s absolute, do not propose. Record negative results so future contributors don't re-investigate.

## Scope guardrails — ask before changing

These surfaces have non-obvious downstream effects. If your task seems to require touching one, **stop and open an issue or ask in the PR draft** rather than expanding scope:

- **Build config** (`bun build` invocation, `tsconfig.json`, `bunfig.toml`).
- **Runtime bundle format.** Must stay IIFE — see "Why" above.
- **`globalThis.anime` shim contract** in `src/runtime/_anime.ts` and `src/output/anime-loader.ts`. Changing one without the other breaks the runtime.
- **`src/constants.ts`** — values are referenced from many places; touch only with a clear ask.
- **`src/animation/scene/types.ts`** — the build/runtime IR contract. Widening fields silently breaks the consumer side.
- **`.github/workflows/*` job names.** The protected branch rule references the check named exactly `Test`. If you introduce a matrix on the test job, use an aggregator job named `Test` with `needs: [test]` rather than touching the rule from a PR.
- **Adding new dependencies.** Open an issue first.
- **Reverting decisions captured in past PRs** without first reading the relevant PR description.

## When in doubt

1. Read `STATE.md` for current focus and recent decisions.
2. Read the canonical example before inventing a new pattern (e.g., `src/runtime/timeline.ts` for timeline composition).
3. Fetch upstream docs rather than guessing v4 APIs from training data: https://animejs.com/documentation/.
4. Open a draft PR or GitHub issue early; the maintainer would rather steer scope before code than after.
