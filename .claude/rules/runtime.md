---
paths:
  - "src/runtime/**/*.ts"
  - "src/animation/scene/**/*.ts"
description: "Runtime + Scene IR invariants. Loads automatically on edits to the runtime bundle and the build/runtime contract."
---

# Editing the runtime / Scene IR

These rules apply whenever you touch `src/runtime/**` or `src/animation/scene/**`. They exist because these surfaces have non-obvious cross-file invariants — the kind that don't show up in a single-file review and only break when the bundle ships.

## Bundle invariants

- **Bundle format must stay IIFE.** The runtime bundle (`dist-runtime/runtime.js`) is loaded via classic `<script>` in the generated HTML. ESM ends with `export {…}` (illegal in a classic script); `<script type="module">` defers and would race the classic scripts that follow it. If you need to change the build entry, keep `format: 'iife'` in `bun build`.
- **Bundle size budget: ~64 KB (CEILING_KB = 100 in `build-runtime.ts`).** Currently ~56 KB: ~45 KB tree-shaken anime.js subset + ~11 KB hansoom logic. R3 had two failed attempts to inline an *un-shaken* anime.js (~108 KB UMD) — both blew past the runtime ceiling. PR #49 made inlining work by relying on anime.js's `sideEffects: false` flag + Bun's tree-shaker, which dropped ~58% of the library (canvas/draggable/scroll/etc.).
- **anime.js comes through `src/runtime/_anime.ts`.** Since PR #49 that file *re-exports named values* directly from `'animejs'` (no `globalThis.anime` shim, no separate UMD `<script>`). The runtime build has NO `external: ['animejs']` flag — anime.js is bundled in. Importing `'animejs'` directly from any other runtime file is fine; the tree-shaker dedupes.
- **Outside `src/runtime/`, anime.js imports must be type-only.** `import type * as Anime from 'animejs'` erases at build. A non-type import outside the runtime would inline anime.js a *second* time into the CLI bundle (and any other build entrypoint), which is the bug this rule prevents.

## Scene IR contract

- **`src/animation/scene/types.ts` is the build-side ↔ runtime-side contract.** Both producers (build) and consumers (runtime) depend on the IR shape. Adding a primitive (e.g., a new step kind) means:
  1. Extend the IR types first.
  2. Update the producer (build side).
  3. Update the consumer (runtime side).
  4. Pinned visual tests stay green.
  - Updating only one side ships a runtime that ignores new IR fields, or a producer that emits IR the runtime can't parse.
- **Don't widen IR fields silently.** If a field becomes optional, every consumer needs to handle the absent case. The Scene IR is small enough that an exhaustive check is cheap.

## Runtime behavior invariants

- **For backward `seek`, clear node/edge classes first then call `applyCompletedThroughStep`.** `seek(time, muteCallbacks)` does not replay `timeline.call` segments crossed by the seek path. The helper is the deterministic-state recovery; using `seek` alone leaves stale `soom-node-active` classes after a backward jump.
- **Speed control goes through the Timer/Clock, not `playbackRate`.** Assigning to `timeline.playbackRate` in v4 is silently dropped. The runtime's `setSpeed` was a no-op from R3 → PR #38 because of this — don't reintroduce.
- **Class state is the source of truth for "what step are we on."** The runtime applies/removes `soom-node-active`, `soom-node-completed`, `soom-edge-active`, `soom-edge-completed`. CSS reads those classes. JS reaching into element styles directly is a layering violation — push the change into the class set instead.

## Type safety

- **`bun run typecheck` runs in CI as of PR #38.** Treat tsc errors here like runtime exceptions. Three "harmless" tsc errors in this directory had been masking two latent runtime bugs. If a type error appears, read it; don't paper over it with `as any` or `// @ts-ignore`.

## Cross-references (do not duplicate)

- Anime.js usage rules and the v3→v4 migration cheat-sheet live in the **`using-anime-js` skill** at `.claude/skills/using-anime-js/SKILL.md` (auto-triggers on animation tasks).
- Project-wide conventions and the `ask_before_changing` scope guardrails live at `~/ObsidianVault/hansoom/_context/CONVENTIONS.md`.
- Recent learnings that informed these invariants: `~/ObsidianVault/hansoom/learnings/refactor-animejs-timeline.md`, `learnings/feat-runtime-anime-native.md`, `learnings/chore-runtime-debt.md`.

## When in doubt

Stop and ask. The runtime is the surface where small mistakes ship as broken HTML output, and the visual-identity tests catch *visible* regressions but not behavioral drift (e.g., `setSpeed` was broken for months without the visual gate noticing).
