#!/bin/bash
# PreToolUse hook: stop `npm test` from hanging the session.
#
# `npm test` maps to `vitest` with no args, which starts WATCH MODE and never exits.
# An agent that runs it waits forever and the turn dies. This hook blocks that one
# command and points at the correct alternatives. Everything else passes through.

input=$(cat)

command=$(echo "$input" | jq -r '.tool_input.command // empty')
[ -z "$command" ] && exit 0

# Match `npm test` / `npm run test` only when NOT followed by a subcommand
# (test:run, test:ui, test:coverage are all fine — they exit on their own).
if echo "$command" | grep -qE '(^|[;&|]|\s)npm\s+(run\s+)?test\s*($|[;&|])'; then
  cat >&2 <<'EOF'
BLOCKED: `npm test` starts vitest in watch mode and never exits — it will hang this session.

Use one of these instead:
  make verify        typecheck + all tests (the standard "am I done?" check)
  make test          tests only, runs once and exits
  npm run test:run   same as `make test`, if make is unavailable

Note: two tests (cropGrowth, eventChains) already fail on main for unrelated reasons.
"2 failed" is the expected baseline, not a regression you caused.
EOF
  exit 2
fi

exit 0
