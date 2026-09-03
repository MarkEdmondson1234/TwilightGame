import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Base configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React plugin
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // TypeScript-specific rules
  {
    rules: {
      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Allow explicit any in some cases (warn instead of error)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow empty functions (useful for default callbacks)
      '@typescript-eslint/no-empty-function': 'off',

      // Allow non-null assertions (common in game code)
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Prettier must be last to override other formatting rules
  prettier,

  // §2 of docs/PENDING_CLEANUP.md: console.log is migrating to the category-
  // gated utils/debugLog.ts helper. Files listed here have completed the
  // migration; extend this list as each subsystem converts. console.warn and
  // console.error stay permitted everywhere — they carry player-relevant
  // failure diagnostics and are deliberately ungated.
  {
    files: [
      'utils/debugLog.ts',
      'utils/dialogueHandlers.ts',
      'GameState.ts',
      'GameStatePersistence.ts',
      'utils/farmManager.ts',
      'utils/FriendshipManager.ts',
      'utils/actionHandlers.ts',
      'utils/gameInitializer.ts',
      'maps/procedural.ts',
      'utils/inventoryManager.ts',
      'utils/AudioManager.ts',
      'App.tsx',
    ],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },

  // The helper itself is the single sanctioned console.log site.
  {
    files: ['utils/debugLog.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'public/assets-optimized/',
      '*.config.js',
      '*.config.ts',
      'scripts/',
      // Agent tooling, not game source — same reasoning as scripts/ above.
      // These are Node scripts and would need a separate env to lint cleanly.
      '.claude/',
      'validate-build.js',
      'public/sw.js',
    ],
  }
);
