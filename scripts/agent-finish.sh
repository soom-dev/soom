#!/usr/bin/env bash
# scripts/agent-finish.sh — clean up an agent-ready worktree after its PR merges.
#
# Usage:
#   bash scripts/agent-finish.sh <name>     (e.g. soom-cli-20260413-1202 or just cli-20260413-1202)
#   bash scripts/agent-finish.sh            (lists active worktrees)
#
# Removes the worktree, deletes the local branch if merged, prunes stale refs.
# Prompts before destructive action when the branch isn't merged yet.

set -euo pipefail

REPO_ROOT="$HOME/dev/soom"
cd "$REPO_ROOT"

NAME="${1:-}"
if [ -z "$NAME" ]; then
  echo "Usage: $0 <worktree-name>" >&2
  echo
  echo "Active worktrees:" >&2
  git worktree list 2>&1 | sed 's/^/  /' >&2
  exit 1
fi

# Normalize: accept either full "soom-<scope>-<id>" or just "<scope>-<id>"
[[ "$NAME" == soom-* ]] || NAME="soom-$NAME"
WORKTREE_PATH="$HOME/dev/$NAME"

if [ ! -d "$WORKTREE_PATH" ]; then
  echo "Worktree not found: $WORKTREE_PATH" >&2
  echo
  echo "Active worktrees:" >&2
  git worktree list 2>&1 | sed 's/^/  /' >&2
  exit 1
fi

# Get the branch name from the worktree
BRANCH=$(git -C "$WORKTREE_PATH" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# Check if there are uncommitted changes in the worktree
if [ -n "$(git -C "$WORKTREE_PATH" status --porcelain)" ]; then
  echo "WARNING: $WORKTREE_PATH has uncommitted changes:" >&2
  git -C "$WORKTREE_PATH" status --short | head -10 | sed 's/^/  /' >&2
  read -p "  Discard them and remove the worktree anyway? [y/N] " yn
  case "$yn" in [Yy]*) FORCE_FLAG="--force" ;; *) exit 0 ;; esac
else
  FORCE_FLAG=""
fi

# Verify the branch is merged into main (warn if not)
if [ -n "$BRANCH" ]; then
  git fetch origin main --quiet
  if ! git branch -r --merged origin/main 2>/dev/null | grep -qE "^[[:space:]]*origin/${BRANCH}$"; then
    echo "WARNING: branch '$BRANCH' is not yet merged into origin/main." >&2
    echo "  Check the PR status:  gh pr list --head $BRANCH" >&2
    read -p "  Remove the worktree anyway? [y/N] " yn
    case "$yn" in [Yy]*) ;; *) exit 0 ;; esac
  fi
fi

# Remove the worktree
git worktree remove $FORCE_FLAG "$WORKTREE_PATH"
echo "✓ Worktree removed: $WORKTREE_PATH"

# Delete the local branch if merged
if [ -n "$BRANCH" ]; then
  if git branch --merged origin/main 2>/dev/null | grep -qE "^[[:space:]]*${BRANCH}$"; then
    git branch -d "$BRANCH"
    echo "✓ Local branch deleted: $BRANCH"
  else
    echo "  Note: branch '$BRANCH' kept locally (not merged into origin/main)."
    echo "        Delete manually with:  git branch -D $BRANCH"
  fi
fi

# Prune stale refs
git worktree prune
echo "✓ Stale worktree refs pruned"
