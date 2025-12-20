# Dev Server Skill

Manages the TwilightGame development server, ensuring only one instance runs at a time.

**Cross-platform**: Works on macOS, Linux, and Windows.

## Usage

Use this skill when the user asks to:
- Start the dev server
- Launch the game
- Run the game server
- Check if the server is running
- **Reload/restart after HMR issues**
- **Fix browser hang after multiple file changes**

## Commands (Cross-Platform)

### Start/Restart Server (default)

```bash
npm run dev:start
```

Kills any existing servers and starts a fresh one.

### Full Reload (clears cache)

```bash
npm run dev:reload
```

Use this when:
- Browser hangs after many file changes
- HMR cascade issues (Vite sending too many updates)
- After git pull/sync with many changes
- Game won't load properly

The `--reload` flag clears Vite's cache before restarting.

## Make Commands (Unix only)

Users on macOS/Linux can also use make commands:
- `make dev` - Start dev server
- `make reload` - Full reload with cache clear (calls npm run dev:reload)
- `make test-game` - Open game in browser

## What the Script Does

1. Finds any existing Vite dev servers
2. Kills them if found
3. Clears Vite cache (if `--reload` flag used)
4. Starts a fresh dev server on port 4000 (or next available)
5. Reports the URL to access the game

## Output

After running, tell the user:
- The URL where the game is running (e.g., http://localhost:4000/TwilightGame/)
- How many old servers were killed (if any)
- If cache was cleared, remind them to hard refresh:
  - macOS/Linux: Cmd+Shift+R
  - Windows: Ctrl+Shift+R

## Troubleshooting HMR Cascade Hangs

**Symptoms:**
- Browser becomes unresponsive
- Game won't load (infinite loading)
- JavaScript consuming high CPU
- Console shows many rapid HMR updates

**Cause:** When many files change at once (git sync, Claude edits), Vite's Hot Module Replacement sends updates for each file, overwhelming the browser.

**Solution:** Use the reload command to clear cache and restart fresh:
```bash
npm run dev:reload
```
