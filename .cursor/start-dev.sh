#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="wine-inventory-dev"
TMUX_CONF="/exec-daemon/tmux.portal.conf"

if ! tmux -f "$TMUX_CONF" has-session -t "=$SESSION_NAME" 2>/dev/null; then
  tmux -f "$TMUX_CONF" new-session -d -s "$SESSION_NAME" -c /workspace -- "${SHELL:-bash}" -l
  tmux -f "$TMUX_CONF" send-keys -t "$SESSION_NAME:0.0" "npm run dev" C-m
fi
