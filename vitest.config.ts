import { defineConfig, defaultExclude } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    // Git worktrees live under .claude/worktrees/ and carry their own copy of
    // tests/. Without this, a run from the main repo collects every worktree's
    // suite too, inflating counts and reporting failures from unrelated branches.
    exclude: [...defaultExclude, '**/.claude/worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '*.config.ts', 'dist/'],
    },
  },
});
