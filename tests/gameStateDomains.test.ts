/**
 * GameState domain methods — every method in state/*.ts must be attached, once.
 *
 * WHY THIS EXISTS
 * ---------------
 * GameStateManager's methods live in per-domain files under state/ and are
 * copied onto its prototype in GameState.ts. Two failure modes are silent:
 *   - a new state/ file that is not added to attachMethods() type-checks if
 *     it is also missing from the interface, but its methods are undefined at
 *     runtime ("gameState.foo is not a function" in production);
 *   - two domains (or a domain and the core class) defining the same method
 *     name: the later one silently replaces the earlier.
 *
 * HOW TO FIX A FAILURE
 * --------------------
 * List the new `<domain>Methods` in both the `GameStateManager` interface and
 * the `attachMethods()` call in GameState.ts, and rename duplicate methods.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { gameState, GameStateManager } from '../GameState';

const STATE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'state');

async function loadDomains(): Promise<Record<string, Record<string, unknown>>> {
  const domains: Record<string, Record<string, unknown>> = {};
  for (const file of fs.readdirSync(STATE_DIR).filter((f) => f.endsWith('.ts'))) {
    const mod = (await import(`../state/${file.replace(/\.ts$/, '')}`)) as Record<string, unknown>;
    for (const [exportName, value] of Object.entries(mod)) {
      if (exportName.endsWith('Methods') && value && typeof value === 'object') {
        domains[`${file}:${exportName}`] = value as Record<string, unknown>;
      }
    }
  }
  return domains;
}

describe('GameState domain methods', () => {
  it('finds the domain files (guards against a broken scan)', async () => {
    expect(Object.keys(await loadDomains()).length).toBeGreaterThanOrEqual(8);
  });

  it('every domain method is attached to gameState', async () => {
    const missing: string[] = [];
    for (const [domain, methods] of Object.entries(await loadDomains())) {
      for (const [name, fn] of Object.entries(methods)) {
        if ((gameState as unknown as Record<string, unknown>)[name] !== fn) {
          missing.push(`${domain} → ${name}`);
        }
      }
    }
    expect(
      missing,
      `Not attached — add the domain to attachMethods() in GameState.ts:\n  ${missing.join('\n  ')}`
    ).toEqual([]);
  });

  it('no method name is defined twice (across domains or with the core class)', async () => {
    const owners = new Map<string, string[]>();
    const core = Object.getOwnPropertyNames(GameStateManager.prototype);
    const domains = await loadDomains();
    const domainNames = new Set(Object.values(domains).flatMap((m) => Object.keys(m)));
    for (const name of core) {
      if (name !== 'constructor' && !domainNames.has(name)) owners.set(name, ['GameState.ts']);
    }
    for (const [domain, methods] of Object.entries(domains)) {
      for (const name of Object.keys(methods)) {
        owners.set(name, [...(owners.get(name) ?? []), domain]);
      }
    }
    const dupes = [...owners]
      .filter(([, where]) => where.length > 1)
      .map(([n, w]) => `${n}: ${w.join(', ')}`);
    expect(
      dupes,
      `Duplicate GameState methods — the later one silently wins:\n  ${dupes.join('\n  ')}`
    ).toEqual([]);
  });

  it('attached methods are non-enumerable, like class methods', () => {
    expect(Object.keys(GameStateManager.prototype)).toEqual([]);
  });
});
