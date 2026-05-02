# `src/` — Pipeline Tour

High-level reading guide for the Hansoom codebase. Start at `cli.ts`, follow the call chain in `pipeline.ts`, then drill into modules as needed.

## Pipeline (`pipeline.ts`)

`renderCommand` is the single entry point. The flow:

1. **Read source** — load the `.mmd` file from disk.
2. **`render/playwright.ts`** — launch headless Chromium, inject Mermaid.js, render the diagram with dagre layout, extract the SVG string with re-measured label widths.
3. **`render/post-process.ts`** — inject the `<filter id="soom-glow">` into SVG `<defs>`; add `data-node-id` attributes to `.node` elements derived from Mermaid's `flowchart-{name}-{index}` IDs.
4. **`render/graph-extractor.ts`** — build an `AnimaGraph` (typed nodes + edges) from the SVG. Edge IDs come from Mermaid's `L_Source_Target_0` patterns; labels come from the original Mermaid source text.
5. **`sequencer/auto.ts`** — convert the graph into an `AnimationSequence` (ordered steps) using a cycle-breaking topological sort.
6. **`animation/engine.ts`** — generate the per-step animation JavaScript on top of `animation/runtime/` primitives (anime.js v4 timeline, drawables, motion paths).
7. **`output/html.ts`** — assemble the self-contained HTML: SVG + theme CSS (`themes/`) + animation script + playback controls (`output/controls.ts`) + watermark (`watermark/`) + DOMPurify sanitization + strict CSP.
8. **Write + open** — write the HTML, open in the user's default browser if `--open`.

## Modules

| Path | Purpose |
|---|---|
| `cli.ts` | Commander-based CLI; wires flags into `renderCommand`. |
| `pipeline.ts` | Orchestrates the render pipeline above. |
| `constants.ts` | Shared timing, z-index, and layout values used across animation + theme. |
| `types.ts` | `AnimaGraph`, `AnimationSequence`, and other pipeline-wide types. |
| `render/` | Playwright-driven Mermaid rendering, SVG post-processing, graph extraction. |
| `sequencer/` | Graph → ordered animation sequence. `auto.ts` is the only sequencer today. |
| `animation/` | `engine.ts` generates animation JS; `runtime/` holds the in-page anime.js primitives; `data.ts` carries timing data. |
| `output/` | HTML assembly, CSP/sanitization (`sanitize.ts`), playback controls UI (`controls.ts`), theme toggle (`toggle.ts`), anime.js loader (`anime-loader.ts`). |
| `themes/` | `base.ts` (shared CSS), `dark.ts`, `light.ts` (theme-specific tokens). |
| `watermark/` | Animated wordmark — SVG path generation (`paths.ts`, `svg.ts`) and timeline (`animation.ts`). |
| `utils/` | Cross-cutting helpers; currently just `browser.ts` (platform-appropriate "open file"). |

## Conventions

- `.js` extensions in import paths (TypeScript ESM requirement, even for `.ts` source).
- `mermaid` and `dompurify` are imported dynamically inside functions to avoid module-evaluation-time conflicts with jsdom globals (see `learnings/chore-project-scaffold.md` in the vault).
- All output is self-contained: no external scripts, no fetch at runtime, strict CSP enforced via `output/sanitize.ts` and a meta tag.

## Related notes

- `~/Documents/ObsidianVault/hansoom/architecture/technical-design.md` — full architecture rationale, decision history, and future considerations.
- `~/Documents/ObsidianVault/hansoom/learnings/` — per-PR retrospectives for each module's gotchas.
