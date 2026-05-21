#!/usr/bin/env bash
# Stop hook: full Next.js production build.
# Exit 2 (blocking) if the build fails so Claude is forced to fix it before
# handing back to the user.
HOOK_NAME="build"
# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

# Skip if package.json doesn't declare a build script (defensive — front-end
# always has one, but this keeps the hook safe if the script is renamed).
if ! node -e 'process.exit(require("./package.json").scripts?.build ? 0 : 1)'; then
  hook_log "no build script in package.json, skipping"
  exit 0
fi

# Next.js writes to .next/ — make sure the tree is writable before we start.
run_or_block "next build" -- npm run build --silent
