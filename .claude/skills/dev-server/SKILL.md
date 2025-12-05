# Dev Server Skill

Manages the TwilightGame development server, ensuring only one instance runs at a time.

## Usage

Use this skill when the user asks to:
- Start the dev server
- Launch the game
- Run the game server
- Check if the server is running

## Instructions

When invoked, run the start script:

```bash
bash /Users/mark/dev/TwilightGame/.claude/skills/dev-server/scripts/start_server.sh
```

The script will:
1. Find any existing Vite dev servers for TwilightGame
2. Kill them if found
3. Start a fresh dev server on port 4000 (or next available)
4. Report the URL to access the game

## Output

After running, tell the user:
- The URL where the game is running (e.g., http://localhost:4000/TwilightGame/)
- How many old servers were killed (if any)
