#!/usr/bin/env bash
# Shared helpers for Claude Code Stop hooks.
# Sourced by build.sh, check.sh, test.sh.
#
# Conventions enforced by Claude Code (https://code.claude.com/docs/en/hooks):
#   - exit 0  -> hook passed, Claude is allowed to stop
#   - exit 2  -> blocks Claude from stopping; stderr is fed back as a system
#                reminder so Claude can react and fix the failure
#   - other non-zero codes are treated as non-blocking errors and ignored

set -euo pipefail

# Read JSON input from stdin once, expose to caller as $HOOK_INPUT.
HOOK_INPUT="$(cat || true)"

# Recursion guard: when a Stop hook blocks with exit 2, Claude continues and
# eventually fires Stop again. If the same hook blocks again without checking
# stop_hook_active, the conversation loops forever. The Anthropic docs and
# every production example call this out as the single most common Stop-hook
# bug, so always short-circuit when this flag is true.
if printf '%s' "$HOOK_INPUT" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

# Resolve project root. CLAUDE_PROJECT_DIR is set by Claude Code on every
# hook invocation; fall back to the script's own directory for manual runs.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$PROJECT_DIR"

# Emit a labeled stderr line. Stderr is what Claude sees when we exit 2,
# so keep messages short and actionable.
hook_log() {
  printf '[hook:%s] %s\n' "${HOOK_NAME:-?}" "$*" >&2
}

# Run a command, capture combined output, and on failure exit 2 with a tail
# of the output so Claude has something concrete to fix.
# Usage: run_or_block "human label" -- <command...>
run_or_block() {
  local label="$1"; shift
  [ "${1:-}" = "--" ] && shift
  hook_log "running: $label"
  local tmp
  tmp="$(mktemp)"
  if ! "$@" >"$tmp" 2>&1; then
    local rc=$?
    hook_log "FAILED: $label (exit $rc)"
    # Tail the last ~80 lines so Claude gets the error without context bloat.
    tail -n 80 "$tmp" >&2
    rm -f "$tmp"
    exit 2
  fi
  rm -f "$tmp"
  hook_log "ok: $label"
}
