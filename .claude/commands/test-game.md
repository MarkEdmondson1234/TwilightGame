---
description: Launch game-tester agent to test the game in Chrome using MCP tools
allowed-tools: Task(*), Bash(*), mcp__chrome-devtools__*
---

Launch the game-tester agent to test TwilightGame in Chrome.

Read .claude/agents/game-tester.md and follow its instructions to:
1. Check if dev server is running at http://localhost:3000
2. Start dev server if needed (npm run dev in background)
3. Use Chrome DevTools MCP tools to open and test the game
4. Test core functionality (movement, collisions, map transitions, etc.)
5. Provide test report with screenshots and console output

Be autonomous and test all functionality unless specific area is mentioned.
