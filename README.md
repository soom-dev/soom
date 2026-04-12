# Hansoom (한숨)

> Breathe life into your diagrams. Turn Mermaid files into animated, interactive HTML with playback controls, edge flow animation, and step-by-step walkthroughs.

**Status:** Phase 0 — Project scaffold with working CLI and static rendering.

## Quickstart

```bash
# Install globally
bun add -g hansoom

# Render a Mermaid diagram to interactive HTML
soom render diagram.mmd

# Specify output path and theme
soom render diagram.mmd -o output.html -t light
```

## Development

```bash
# Clone and install
git clone https://github.com/soom-dev/soom.git
cd soom
bun install

# Run in development mode
bun run dev render examples/simple.mmd -o /tmp/preview.html

# Run tests
bun test

# Lint and format
bun run lint
bun run format:check

# Build
bun run build
```

## CLI Usage

```
soom render <input> [options]

Arguments:
  input                  input Mermaid file (.mmd or .mermaid)

Options:
  -o, --output <path>    output HTML file path (default: input with .html extension)
  -t, --theme <theme>    color theme: dark or light (default: dark)
  -V, --version          output the version number
  -h, --help             display help for command
```

## Examples

The `examples/` directory includes sample Mermaid diagrams:

- `simple.mmd` — 3-node linear flow
- `branching.mmd` — decision flow with conditional paths
- `microservice.mmd` — microservice architecture diagram
- `cicd.mmd` — CI/CD pipeline flow

## Vision

Hansoom aims to be the go-to tool for turning static diagram-as-code files into animated presentations. The name comes from 한숨 (hansoom), the Korean word for "breath" — because diagrams should breathe.

### Roadmap

- [x] **Phase 0** — Project scaffold, CLI foundation, static Mermaid rendering
- [ ] **Phase 1** — Animation engine (edge flow, node states, playback controls, step annotations)
- [ ] **Phase 2** — Launch (Hacker News, community setup, npm publish)
- [ ] **Phase 3** — Timeline YAML (custom sequences, parallel steps, choreographed animations)
- [ ] **Phase 4** — AI agent integration (structured context export, trace overlay)
- [ ] **Phase 5** — Monetization (Pro tier, funding decision)
- [ ] **Phase 6** — Multi-format support (D2, PlantUML, code scanner)
- [ ] **Phase 7** — Platform (hosted rendering API, VS Code extension, GitHub Action)

## Tech Stack

- **Runtime:** Bun (also compatible with Node >=18)
- **Language:** TypeScript (strict mode)
- **Diagram parsing:** Mermaid.js
- **Output:** Self-contained HTML files with embedded SVG, CSS, and JavaScript

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[Apache 2.0](LICENSE)
