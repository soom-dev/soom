#!/bin/bash
# Run from repo root: bash scripts/cleanup-restructure.sh
# Removes old files/dirs after src/ restructuring

set -e

echo "Removing old source files..."
rm -f src/commands/render.ts
rm -f src/browser/playwright.ts
rm -f src/graph/types.ts
rm -f src/parser/mermaid.ts
rm -f src/parser/index.ts
rm -f src/renderer/watermark-paths.ts

echo "Removing empty directories..."
rmdir src/commands 2>/dev/null || true
rmdir src/browser 2>/dev/null || true
rmdir src/config 2>/dev/null || true
rmdir src/graph 2>/dev/null || true
rmdir src/svg 2>/dev/null || true
rmdir src/parser 2>/dev/null || true
rmdir src/renderer 2>/dev/null || true

echo "Verifying new structure..."
echo "=== src/ ==="
ls -la src/*.ts
echo ""
echo "=== src/render/ ==="
ls src/render/
echo ""
echo "=== src/output/ ==="
ls src/output/
echo ""
echo "=== src/animation/ ==="
ls src/animation/
echo ""

echo "Done. Run 'bun test' to verify."
