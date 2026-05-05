#!/usr/bin/env bash
# scripts/agent-start.sh — spin up a worktree for an agent-ready backlog item.
#
# Usage:
#   bash scripts/agent-start.sh <NNN>          (e.g. 005)
#   bash scripts/agent-start.sh                (lists available items)
#
# Reads the agent-ready file's frontmatter (id, type, scope), constructs the
# canonical branch name and worktree path, and creates the worktree. Prints
# the path and the prompt file location so you can paste into Claude Code.

set -euo pipefail

VAULT="$HOME/ObsidianVault/hansoom"
AGENT_READY_DIR="$VAULT/backlog/agent-ready"
REPO_ROOT="$HOME/dev/soom"

if [ ! -d "$AGENT_READY_DIR" ]; then
  echo "ERROR: agent-ready directory not found at $AGENT_READY_DIR" >&2
  echo "  Expected vault at $VAULT — adjust VAULT constant in this script if your vault path differs." >&2
  exit 1
fi

if [ ! -d "$REPO_ROOT" ]; then
  echo "ERROR: soom repo not found at $REPO_ROOT" >&2
  exit 1
fi

NNN="${1:-}"
if [ -z "$NNN" ]; then
  echo "Usage: $0 <NNN>" >&2
  echo
  echo "Available agent-ready items:" >&2
  ls "$AGENT_READY_DIR" 2>/dev/null \
    | grep -E '^[0-9]+-' \
    | sort \
    | sed 's/^/  /' >&2
  exit 1
fi

# Find the agent-ready file matching the NNN prefix
shopt -s nullglob
matches=( "$AGENT_READY_DIR"/${NNN}-*.md )
shopt -u nullglob

if [ ${#matches[@]} -eq 0 ]; then
  echo "ERROR: no agent-ready file with prefix '${NNN}-' in $AGENT_READY_DIR" >&2
  exit 1
fi
if [ ${#matches[@]} -gt 1 ]; then
  echo "ERROR: multiple files match prefix '${NNN}-':" >&2
  printf '  %s\n' "${matches[@]}" >&2
  exit 1
fi

PROMPT_FILE="${matches[0]}"

# Extract type, scope, id from frontmatter (read only between the first two --- markers)
fm=$(awk '/^---$/{c++; if(c==2) exit; next} c==1' "$PROMPT_FILE")
TYPE=$(echo "$fm" | awk -F': *' '/^type:/{print $2; exit}')
SCOPE=$(echo "$fm" | awk -F': *' '/^scope:/{print $2; exit}')
ID=$(echo "$fm" | awk -F': *' '/^id:/{print $2; exit}')

if [ -z "$TYPE" ] || [ -z "$SCOPE" ] || [ -z "$ID" ]; then
  echo "ERROR: failed to extract type/scope/id from $PROMPT_FILE" >&2
  echo "  Got: type='$TYPE' scope='$SCOPE' id='$ID'" >&2
  exit 1
fi

BRANCH="${TYPE}/${SCOPE}-${ID}"
WORKTREE_NAME="soom-${SCOPE}-${ID}"
WORKTREE_PATH="$HOME/dev/${WORKTREE_NAME}"

cd "$REPO_ROOT"

# If worktree already exists, just print the path
if [ -d "$WORKTREE_PATH" ]; then
  echo "✓ Worktree already exists at: $WORKTREE_PATH"
  echo
  echo "Next:"
  echo "  Open Claude Code at: $WORKTREE_PATH"
  echo "  Prompt file:         $PROMPT_FILE"
  exit 0
fi

# Sanity: prune any stale worktree references
git worktree prune

# Fetch latest main
git fetch origin --quiet

# Create the worktree:
#   - if branch already exists locally, attach to it
#   - elif it exists on origin, create local tracking branch from origin's ref
#   - else create a new branch from origin/main
if git show-ref --quiet "refs/heads/${BRANCH}"; then
  git worktree add "$WORKTREE_PATH" "$BRANCH"
elif git show-ref --quiet "refs/remotes/origin/${BRANCH}"; then
  git worktree add "$WORKTREE_PATH" -b "$BRANCH" "origin/${BRANCH}"
else
  git worktree add "$WORKTREE_PATH" -b "$BRANCH" origin/main
fi

echo
echo "✓ Worktree ready"
echo "  Path:   $WORKTREE_PATH"
echo "  Branch: $BRANCH"
echo "  Prompt: $PROMPT_FILE"
echo
echo "Next steps:"
echo "  1. Open a NEW Claude Code session at:  $WORKTREE_PATH"
echo "  2. Open the prompt file and copy the prompt block:  $PROMPT_FILE"
echo "  3. Paste into Claude Code and let it run."
echo "  4. After PR merges + post-task housekeeping:  bash $REPO_ROOT/scripts/agent-finish.sh $WORKTREE_NAME"
