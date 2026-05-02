# Hansoom (한숨)

> Breathe life into your diagrams. Turn Mermaid files into animated, interactive HTML with playback controls, edge flow animation, and step-by-step walkthroughs.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0-black)](https://bun.sh)

`hansoom` is a CLI that takes a static Mermaid diagram (`.mmd`) and outputs a single self-contained HTML file you can open in any browser, share, or embed. The output ships with a timeline-driven animation engine, playback controls, marching edge animations, and per-step highlighting — built on [anime.js](https://animejs.com/) and [Mermaid](https://mermaid.js.org/).

The command is `soom`; the npm package is `hansoom`. The name comes from 한숨 (*hansoom*), the Korean word for "breath" — because diagrams should breathe.

## Quickstart

```bash
# Install globally
bun add -g hansoom        # or: npm i -g hansoom

# Render a Mermaid diagram to interactive HTML
soom render diagram.mmd

# Specify output path, theme, and auto-open
soom render diagram.mmd -o output.html -t light --open
```

Open the generated `.html` in any modern browser — no server, no build step, no external dependencies at runtime.

## Features

- **Self-contained output** — single HTML file with embedded SVG, CSS, and JS. Strict CSP, no `eval`, safe to host anywhere.
- **Timeline-based animation** — anime.js-powered timeline with seekable playback, idle states, and clean revert.
- **Edge flow animation** — marching-line effects show data movement between nodes.
- **Step-by-step walkthrough** — labels parsed from your Mermaid source advance one step at a time.
- **Playback controls** — play, pause, step forward/back, and seek to any point in the sequence.
- **Themes** — dark and light, with sensible defaults.
- **Bun + Node** — runs natively on Bun, also compatible with Node ≥ 18.

## CLI Usage

```
soom render <input> [options]

Arguments:
  input                  input Mermaid file (.mmd or .mermaid)

Options:
  -o, --output <path>    output HTML file path (default: input with .html extension)
  -t, --theme <theme>    color theme: dark or light (default: dark)
  -O, --open             open the output file in the default browser
  -v, --version          output the version number
  -h, --help             display help for command
```

## Examples

The [`examples/`](examples) directory ships with diagrams you can render to see what hansoom does:

```bash
soom render examples/basic/flow-simple.mmd --open
soom render examples/basic/flow-microservice.mmd --open
soom render examples/microservices/flow-ecommerce.mmd --open
soom render examples/ai/flow-rag.mmd --open
soom render examples/infrastructure/flow-aws-eks.mmd --open
soom render examples/pipelines/flow-cicd-k8s.mmd --open
```

Categories: `basic/`, `simple/`, `microservices/`, `ai/`, `infrastructure/`, `pipelines/`, `meta/`, `stress/`.

## Development

```bash
# Clone and install
git clone https://github.com/soom-dev/soom.git
cd soom
bun install

# Run in development mode
bun run dev render examples/basic/flow-simple.mmd -o /tmp/preview.html

# Quick preview with the bundled microservice example
bun run preview

# Tests, lint, format, build
bun test
bun run lint
bun run format:check
bun run build
```

## Tech Stack

- **Runtime:** Bun (also compatible with Node ≥ 18)
- **Language:** TypeScript (strict mode)
- **Diagram parsing:** [Mermaid.js](https://mermaid.js.org/)
- **Animation:** [anime.js v4](https://animejs.com/) (timeline-based, seekable)
- **Rendering:** [Playwright](https://playwright.dev/) for headless SVG generation
- **Sanitization:** DOMPurify with a strict Content-Security-Policy in every output

## Roadmap

- [x] **Phase 0** — Project scaffold, CLI foundation, static Mermaid rendering
- [x] **Phase 1** — Animation engine (edge flow, node states, playback controls, step annotations)
- [ ] **Phase 2** — Launch (Hacker News, community setup, npm publish)
- [ ] **Phase 3** — Timeline YAML (custom sequences, parallel steps, choreographed animations)
- [ ] **Phase 4** — AI agent integration (structured context export, trace overlay)
- [ ] **Phase 5** — Monetization (Pro tier, funding decision)
- [ ] **Phase 6** — Multi-format support (D2, PlantUML, code scanner)
- [ ] **Phase 7** — Platform (hosted rendering API, VS Code extension, GitHub Action)

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, branch and commit conventions, and the validation checklist your change should pass before merge.

## License

[Apache 2.0](LICENSE)
