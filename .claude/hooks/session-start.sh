#!/bin/bash
# Links Cameron's personal skills/agents from github.com/cameroncrow/workforce
# into ~/.claude/skills and ~/.claude/agents for this remote session — the
# web/mobile equivalent of the symlink he keeps on his PC.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

WORKFORCE_DIR="$HOME/.cache/workforce"
WORKFORCE_URL="https://github.com/cameroncrow/workforce.git"

if [ -d "$WORKFORCE_DIR/.git" ]; then
  git -C "$WORKFORCE_DIR" fetch --depth 1 origin main
  git -C "$WORKFORCE_DIR" reset --hard FETCH_HEAD
else
  rm -rf "$WORKFORCE_DIR"
  git clone --depth 1 --branch main "$WORKFORCE_URL" "$WORKFORCE_DIR"
fi

mkdir -p "$HOME/.claude/skills" "$HOME/.claude/agents"

if [ -d "$WORKFORCE_DIR/skills" ]; then
  for dir in "$WORKFORCE_DIR"/skills/*/; do
    [ -d "$dir" ] || continue
    ln -sfn "${dir%/}" "$HOME/.claude/skills/$(basename "$dir")"
  done
fi

if [ -d "$WORKFORCE_DIR/agents" ]; then
  for dir in "$WORKFORCE_DIR"/agents/*/; do
    [ -d "$dir" ] || continue
    ln -sfn "${dir%/}" "$HOME/.claude/agents/$(basename "$dir")"
  done
fi

echo "workforce: linked $(find "$WORKFORCE_DIR/skills" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l) skills and $(find "$WORKFORCE_DIR/agents" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l) agent departments from $WORKFORCE_URL"
