# soom-telemetry — Cloudflare Worker

Receiver for the Hansoom CLI's anonymous opt-in render telemetry. Free tier
only: D1 + Workers, no paid bindings, no logs of identifiable headers.

The CLI side lives at `src/telemetry/` in this same repo; the user-facing
documentation lives at `docs/site/telemetry.md` and is published at
`hansoom.dev/telemetry`.

## What it accepts

`POST /v1/render` with a JSON body containing exactly these ten fields:

| Field           | Type      | Notes                               |
| --------------- | --------- | ----------------------------------- |
| `version`       | string    | CLI version (npm package version)   |
| `os`            | string    | `process.platform` (darwin/linux/win32/…) |
| `nodeCount`     | number    | Diagram node count                  |
| `edgeCount`     | number    | Diagram edge count                  |
| `hasSubgraphs`  | boolean   | `subgraph` keyword present in source |
| `theme`         | string    | `dark` or `light`                   |
| `usedOpen`      | boolean   | `--open` flag was passed            |
| `renderTimeMs`  | number    | Pipeline duration                   |
| `diagramType`   | string    | `flowchart`, `sequencediagram`, …   |
| `ts`            | string    | Client ISO timestamp                |

Any extra key, missing key, or wrong-typed value → 400, no row written. The
allowlist is enforced before the INSERT, and the schema (`schema.sql`) has
exactly the columns the allowlist describes — adding a column is the only
way to record a new field.

The Worker does **not** log:

- Client IP (`cf-connecting-ip` and friends are not read)
- Request headers
- File paths or file names
- Diagram source content

## Deploy

Prerequisites: a Cloudflare account on the free tier and `wrangler` installed
(`npm i -g wrangler` or `bun add -g wrangler`).

```bash
# 1. Create the D1 database (one-time).
wrangler d1 create soom-telemetry
# → copy the printed database_id into wrangler.toml.

# 2. Apply the schema (one-time, and again on schema changes).
wrangler d1 execute soom-telemetry --remote --file=schema.sql

# 3. Deploy.
wrangler deploy
```

The endpoint URL Cloudflare assigns is what `src/telemetry/constants.ts`
hardcodes as `TELEMETRY_ENDPOINT`. If they don't match, update the constant
and ship a new CLI release.

## Free-tier scope

D1 free tier (as of 2026-04): 5M reads/day, 100k writes/day, 5GB storage.
Worker free tier: 100k requests/day. The CLI is one write per render and
zero reads from the dashboard side (the dashboard is a separate
backlog item). Pre-launch and HN-launch volume sit well under all three
ceilings.

## Privacy posture

This Worker is the receive-side enforcement of the same privacy contract the
CLI side promises:

1. The column set in `schema.sql` IS the field set we'll ever record. No
   "extra" columns "for later."
2. `validate()` in `src/index.ts` rejects requests with extra fields (so a
   future buggy CLI sending more data still gets dropped at the boundary).
3. No headers are logged. `received_at` is the only server-derived value and
   contains no client identity.

Any change that loosens these properties belongs in a PR with the CLI side
and the docs page in the same diff.
