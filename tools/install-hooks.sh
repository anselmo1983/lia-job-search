#!/usr/bin/env bash
# tools/install-hooks.sh — Symlink git hooks from tools/git-hooks/ into .git/hooks/.
#
# Usage:
#   bash tools/install-hooks.sh
#   pnpm prepare          (runs automatically after pnpm install)
#
# Idempotent: re-running is safe.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_SRC="$PROJECT_ROOT/tools/git-hooks"
HOOKS_DST="$PROJECT_ROOT/.git/hooks"

if [ ! -d "$PROJECT_ROOT/.git" ]; then
  echo "⚠️  Not a git repository. Skipping hook installation."
  exit 0
fi

mkdir -p "$HOOKS_DST"

installed=0
for hook in "$HOOKS_SRC"/*; do
  [ -f "$hook" ] || continue
  hook_name="$(basename "$hook")"
  target="$HOOKS_DST/$hook_name"

  # Remove existing hook if it's not a symlink to our source
  if [ -L "$target" ]; then
    existing_target="$(readlink "$target")"
    if [ "$existing_target" = "$hook" ]; then
      continue  # already installed
    fi
    rm "$target"
  elif [ -f "$target" ]; then
    echo "⚠️  Existing hook '$hook_name' is not ours. Backing up to ${hook_name}.bak"
    mv "$target" "${target}.bak"
  fi

  ln -s "$hook" "$target"
  chmod +x "$hook"
  installed=$((installed + 1))
done

if [ "$installed" -gt 0 ]; then
  echo "✅ Installed $installed git hook(s) from tools/git-hooks/"
fi
