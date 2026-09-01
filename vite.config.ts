import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Source-map upload is opt-in: without a token the plugin is left out
  // entirely and the build behaves exactly as it did before. Set locally in
  // .env.local, or in CI via the SENTRY_AUTH_TOKEN secret.
  //
  // Unlike VITE_SENTRY_DSN this token is NOT public — it can write to the
  // Sentry org, so it must never be exposed with a VITE_ prefix (which would
  // embed it in the browser bundle).
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN;
  const uploadSourceMaps = Boolean(sentryAuthToken);

  return {
    base: '/TwilightGame/', // Set base path for GitHub Pages
    server: {
      port: 4000,
      host: '0.0.0.0',
      hmr: true,
    },
    plugins: [
      tailwindcss(),
      react(),
      // Uploads source maps so Sentry stack traces show real file names and
      // line numbers instead of minified `Ri()` / `wW()`. Must come after the
      // other plugins so it sees the final built output.
      ...(uploadSourceMaps
        ? [
            sentryVitePlugin({
              org: 'twilightgame',
              project: 'javascript-react',
              // The org lives on Sentry's EU region. Kept as a fallback for
              // tokens that do not carry a region: without it such a token
              // uploads to the US instance, which succeeds against the wrong
              // org and leaves traces minified with nothing to explain why.
              //
              // Expect a WARN in the build log saying this value was ignored
              // in favour of "https://sentry.io (embedded in token)". That is
              // correct and not a misconfiguration: an organisation auth token
              // (`sntrys_…`) embeds its own region and takes precedence, and
              // routes to the EU org anyway. The warning only means the
              // fallback was not needed.
              url: 'https://de.sentry.io',
              authToken: sentryAuthToken,
              // Must match the `release` passed to Sentry.init() in
              // utils/errorReporting.ts, or uploaded maps never associate with
              // the events they explain.
              release: { name: env.VITE_APP_VERSION },
              sourcemaps: {
                // Delete the .map files once uploaded. The game deploys to
                // GitHub Pages, so anything left in dist/ is world-readable —
                // this keeps full source off the public site while Sentry
                // still has what it needs to symbolicate.
                filesToDeleteAfterUpload: ['./dist/**/*.js.map'],
              },
            }),
          ]
        : []),
    ],
    build: {
      // Only generated when they will be uploaded and then deleted; a plain
      // build stays map-free.
      sourcemap: uploadSourceMaps,
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
