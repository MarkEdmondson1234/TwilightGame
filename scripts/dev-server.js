#!/usr/bin/env node
/**
 * Cross-platform dev server manager
 * Works on macOS, Linux, and Windows
 *
 * Usage:
 *   node scripts/dev-server.js          - Start/restart server
 *   node scripts/dev-server.js --reload - Full reload (clears Vite cache)
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = os.platform() === 'win32';
const projectRoot = path.resolve(__dirname, '..');
const viteCachePath = path.join(projectRoot, 'node_modules', '.vite');

const args = process.argv.slice(2);
const shouldClearCache = args.includes('--reload') || args.includes('-r');

async function killExistingServers() {
  console.log('Stopping existing dev servers...');

  return new Promise((resolve) => {
    if (isWindows) {
      // Windows: Use taskkill to find and kill node processes running vite
      exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', (err, stdout) => {
        if (err || !stdout.includes('node.exe')) {
          console.log('No existing servers found');
          resolve(0);
          return;
        }

        // Kill all node processes (bit aggressive but works)
        exec('taskkill /F /IM node.exe /T 2>nul', (killErr) => {
          if (!killErr) {
            console.log('Killed existing server(s)');
          }
          resolve(1);
        });
      });
    } else {
      // Unix: Use pkill
      exec('pkill -f "node.*vite" 2>/dev/null', (err) => {
        if (!err) {
          console.log('Killed existing server(s)');
          resolve(1);
        } else {
          console.log('No existing servers found');
          resolve(0);
        }
      });
    }
  });
}

function clearViteCache() {
  if (!shouldClearCache) return;

  console.log('Clearing Vite cache...');
  try {
    if (fs.existsSync(viteCachePath)) {
      fs.rmSync(viteCachePath, { recursive: true, force: true });
      console.log('Cache cleared');
    } else {
      console.log('No cache to clear');
    }
  } catch (err) {
    console.warn('Could not clear cache:', err.message);
  }
}

function startServer() {
  console.log('Starting dev server...');

  const npmCmd = isWindows ? 'npm.cmd' : 'npm';
  const child = spawn(npmCmd, ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    detached: !isWindows, // Detach on Unix so it survives parent exit
  });

  // On Unix, unref so parent can exit
  if (!isWindows) {
    child.unref();
  }

  // Give server time to start
  setTimeout(() => {
    console.log('');
    console.log('Dev server starting on http://localhost:4000/TwilightGame/');
    if (shouldClearCache) {
      console.log('');
      if (isWindows) {
        console.log('Cache cleared - do a hard refresh in browser (Ctrl+Shift+R)');
      } else {
        console.log('Cache cleared - do a hard refresh in browser (Cmd+Shift+R)');
      }
    }
  }, 2000);
}

async function main() {
  console.log('');
  console.log('🎮 TwilightGame Dev Server Manager');
  console.log('');

  await killExistingServers();

  // Brief pause to let ports release
  await new Promise(resolve => setTimeout(resolve, 1000));

  clearViteCache();
  startServer();
}

main().catch(console.error);
