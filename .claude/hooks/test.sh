#!/usr/bin/env bash
# Stop hook: run the project's test suite, if one is configured.
# techBridge-front does not currently have a test runner installed. Rather
# than fail noisily, we detect the situation and exit 0 with a notice so the
# hook is ready the moment Jest/Vitest/etc. is added to package.json.
HOOK_NAME="test"
# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

# Decide whether a real test script exists. Anything that looks like the
# default `echo "Error: no test specified" && exit 1` placeholder is ignored.
should_run=$(node -e '
  const t = (require("./package.json").scripts || {}).test || "";
  const placeholder = !t || /no test specified/i.test(t);
  process.stdout.write(placeholder ? "0" : "1");
' 2>/dev/null || echo "0")

if [ "$should_run" != "1" ]; then
  hook_log "no test runner configured, skipping (add a real \"test\" script to package.json to enable)"
  exit 0
fi

run_or_block "npm test" -- npm test --silent -- --ci --reporters=default
