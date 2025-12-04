#!/usr/bin/env bash
# Run game performance profile with automatic dev server management
#
# Usage:
#   run_profile.sh [options]
#
# Options are passed directly to perf-test.js
# Common options:
#   --scenario NAME     Test scenario (idle, movement, stress, explore)
#   --duration MS       Test duration in milliseconds
#   --map ID            Map to test on (village, deep_forest, etc.)
#   --save FILE         Save results to JSON file
#   --compare FILE      Compare against baseline
#   --headed            Show browser window
#   --verbose           Detailed output
#
# Examples:
#   run_profile.sh                          # Basic test
#   run_profile.sh --scenario movement      # Test with movement
#   run_profile.sh --save baseline.json     # Save baseline

set -euo pipefail

# Get the project root (navigate from skill scripts dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT"

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Colour

log() { echo -e "${CYAN}[profile]${NC} $1"; }
warn() { echo -e "${YELLOW}[profile]${NC} $1"; }
error() { echo -e "${RED}[profile]${NC} $1"; }
success() { echo -e "${GREEN}[profile]${NC} $1"; }

# Check if dev server is running
check_server() {
    local port=$1
    curl -s "http://localhost:$port" > /dev/null 2>&1
}

# Find which port the server is on
find_server_port() {
    for port in 4000 4001 4002 3000 3001; do
        if check_server $port; then
            echo $port
            return 0
        fi
    done
    return 1
}

# Start dev server in background
start_server() {
    log "Starting dev server..."
    npm run dev > /tmp/twilight-dev-server.log 2>&1 &
    DEV_SERVER_PID=$!

    # Wait for server to start
    local attempts=0
    local max_attempts=30
    while [ $attempts -lt $max_attempts ]; do
        if PORT=$(find_server_port); then
            success "Dev server started on port $PORT"
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
    done

    error "Failed to start dev server after ${max_attempts}s"
    cat /tmp/twilight-dev-server.log
    return 1
}

# Main
main() {
    log "TwilightGame Performance Profiler"
    echo ""

    # Check if server is already running
    if PORT=$(find_server_port); then
        log "Dev server already running on port $PORT"
        STARTED_SERVER=false
    else
        warn "Dev server not running"
        start_server
        PORT=$(find_server_port)
        STARTED_SERVER=true
    fi

    # Determine the URL (handle base path)
    URL="http://localhost:$PORT"
    # Check if it's using /TwilightGame/ path
    if curl -s "$URL/TwilightGame/" > /dev/null 2>&1; then
        URL="$URL/TwilightGame/"
    fi

    log "Testing at: $URL"
    echo ""

    # Run the performance test
    node scripts/perf-test.js --url "$URL" "$@"
    EXIT_CODE=$?

    # Cleanup if we started the server
    if [ "$STARTED_SERVER" = true ] && [ -n "${DEV_SERVER_PID:-}" ]; then
        log "Stopping dev server (PID: $DEV_SERVER_PID)"
        kill $DEV_SERVER_PID 2>/dev/null || true
    fi

    exit $EXIT_CODE
}

main "$@"
