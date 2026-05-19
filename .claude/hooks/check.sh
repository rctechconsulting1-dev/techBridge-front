#!/usr/bin/env bash
# Stop hook: static checks — TypeScript typecheck + ESLint.
# Faster than build, catches the bulk of "I broke something" issues.
HOOK_NAME="check"
# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

# tsc --noEmit is the canonical "did Claude break a type" check. We run it
# even when `next build` would also run it, because tsc alone is ~10x faster
# than a full Next build and gives a cleaner error trail.
run_or_block "tsc --noEmit" -- npx --no-install tsc --noEmit -p tsconfig.json

# ESLint — package.json defines `lint` as `eslint src --ext .ts,.tsx`.
if node -e 'process.exit(require("./package.json").scripts?.lint ? 0 : 1)'; then
  run_or_block "eslint" -- npm run lint --silent
else
  hook_log "no lint script, skipping"
fi
