# Telemetry

Hansoom collects **anonymous, opt-in** usage data to help prioritize development. No personally identifiable information is ever collected.

## What is collected

Each successful render sends one POST request containing exactly these fields:

| Field | Type | Description |
|---|---|---|
| `version` | string | CLI version (e.g. `"0.1.0"`) |
| `os` | string | `process.platform` — `darwin`, `linux`, or `win32` |
| `nodeCount` | number | Number of nodes in the diagram |
| `edgeCount` | number | Number of edges in the diagram |
| `hasSubgraphs` | boolean | Whether the diagram contains a `subgraph` block |
| `theme` | string | Color theme used (`dark` or `light`) |
| `usedOpen` | boolean | Whether `--open` flag was passed |
| `renderTimeMs` | number | Milliseconds from render start to HTML write |
| `diagramType` | string | First keyword of the diagram source (e.g. `flowchart`, `sequencediagram`) |
| `ts` | string | ISO 8601 timestamp from the client at render time |

## What is NOT collected

- File paths, file names, or diagram source content
- IP addresses or any header that could identify you
- Machine hostname, username, or environment variables
- Any field not listed above — the receiver rejects requests with extra fields

## Endpoint

Requests go to a Cloudflare Worker (free tier) at:

```
https://soom-telemetry.hansoom.workers.dev/v1/render
```

The Worker source is in this repository under [`worker/src/index.ts`](../../worker/src/index.ts). The receiver enforces the same 10-field schema at the database level — there is no IP column in the D1 table.

## Opting out

Run once:

```bash
soom telemetry disable
```

This writes `{"enabled":false}` to `~/.soom/telemetry.json`. No data is sent from that point on — not even a ping confirming the opt-out.

To re-enable:

```bash
soom telemetry enable
```

To check current status:

```bash
soom telemetry status
```

## First-run notice

On your first render after installation, a notice is printed to stderr explaining the above and showing the opt-out command. Subsequent renders are silent. The notice only appears once.

## CI environments

If you run Hansoom in CI and prefer not to write to `~/.soom/`, you can opt out explicitly:

```bash
soom telemetry disable
```

An env-var override (`HANSOOM_TELEMETRY_DISABLED`) may be added in a future release to avoid needing a filesystem write in ephemeral environments.
