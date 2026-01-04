#!/bin/bash
# PostToolUse hook: Auto-fix lint and format TypeScript files
# This hook is non-blocking - fixes what it can, reports the rest

# Read JSON input from stdin
input=$(cat)

# Extract file path from tool input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Exit early if no file path
if [ -z "$file_path" ]; then
  exit 0
fi

# Only process TypeScript files
if [[ ! "$file_path" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

# Check if file exists
if [ ! -f "$file_path" ]; then
  exit 0
fi

# Change to project directory
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(dirname "$file_path")"

# Run ESLint with --fix to auto-fix issues
npx eslint "$file_path" --fix --quiet 2>/dev/null

# Run Prettier to format
npx prettier --write "$file_path" 2>/dev/null

# Always exit 0 to be non-blocking
exit 0
