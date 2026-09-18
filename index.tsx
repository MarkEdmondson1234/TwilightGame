import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/global.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initErrorReporting, onUncaughtError, onRecoverableError } from './utils/errorReporting';
import { suppressBrowserContextMenu } from './utils/suppressBrowserContextMenu';
import { debugLog } from './utils/debugLog';
import { registerServiceWorker, browserServiceWorkerDeps } from './utils/serviceWorkerUpdates';

// No-ops when VITE_SENTRY_DSN isn't set — see utils/errorReporting.ts.
// Called before render so it can catch errors from mount onward.
initErrorReporting();

// Right-click is a game input (emote picker, inventory item actions), so the
// browser's menu must never appear over the game. See the module for why this
// has to be document-level.
suppressBrowserContextMenu();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement, { onUncaughtError, onRecoverableError });
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for PWA support (production only)
// In development, SW caching interferes with Vite's HMR and can serve stale content.
// The update policy (re-check on return, reload onto a new build only while
// the tab is hidden) lives in utils/serviceWorkerUpdates.ts.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const deps = browserServiceWorkerDeps();
    if (deps) registerServiceWorker({ ...deps, log: (message) => debugLog('PWA', message) });
  });
}
