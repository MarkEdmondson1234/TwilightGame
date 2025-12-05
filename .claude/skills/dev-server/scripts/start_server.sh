#!/bin/bash
# TwilightGame Dev Server Manager
# Kills any existing servers and starts a fresh one

cd /Users/mark/dev/TwilightGame

# Find existing Vite processes for this project
PIDS=$(ps aux | grep "node.*TwilightGame.*vite" | grep -v grep | awk '{print $2}')

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

# Start new server in background
echo "Starting dev server..."
npm run dev &

# Wait for server to be ready
sleep 3

# Find which port it's running on
PORT=$(lsof -i -P | grep "node.*LISTEN" | grep -E "400[0-9]" | head -1 | awk '{print $9}' | cut -d: -f2)

if [ -n "$PORT" ]; then
    echo "Game running at: http://localhost:$PORT/TwilightGame/"
else
    echo "Server started (check terminal for port)"
fi
