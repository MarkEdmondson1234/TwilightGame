#!/bin/bash
# TwilightGame Dev Server Manager
# Kills any existing servers, clears cache, and starts a fresh one
#
# Usage:
#   ./start_server.sh          - Start/restart server
#   ./start_server.sh --reload - Full reload (clears Vite cache)

cd /Users/mark/dev/TwilightGame

CLEAR_CACHE=false
if [ "$1" = "--reload" ] || [ "$1" = "-r" ]; then
    CLEAR_CACHE=true
fi

# Find existing Vite processes for this project
PIDS=$(ps aux | grep "node.*vite" | grep -v grep | awk '{print $2}')

KILLED=0
if [ -n "$PIDS" ]; then
    for PID in $PIDS; do
        kill "$PID" 2>/dev/null && ((KILLED++))
    done
    echo "Killed $KILLED existing server(s)"
    sleep 1  # Give ports time to release
else
    echo "No existing servers found"
fi

# Clear Vite cache if requested (fixes HMR cascade issues)
if [ "$CLEAR_CACHE" = true ]; then
    echo "Clearing Vite cache..."
    rm -rf node_modules/.vite
fi

# Start new server in background
echo "Starting dev server..."
npm run dev &

# Wait for server to be ready
sleep 3

# Find which port it's running on
PORT=$(lsof -i -P 2>/dev/null | grep "node.*LISTEN" | grep -E "400[0-9]" | head -1 | awk '{print $9}' | cut -d: -f2)

if [ -n "$PORT" ]; then
    echo ""
    echo "Game running at: http://localhost:$PORT/TwilightGame/"
    if [ "$CLEAR_CACHE" = true ]; then
        echo ""
        echo "Cache cleared - do a hard refresh in browser (Cmd+Shift+R)"
    fi
else
    echo "Server started (check terminal for port)"
fi
