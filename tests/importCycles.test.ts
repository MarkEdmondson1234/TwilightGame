/**
 * Runtime import cycles — no new ones.
 *
 * WHY THIS EXISTS
 * ---------------
 * A runtime import cycle means module evaluation order decides whether a binding
 * exists yet. Nothing breaks until someone adds a top-level use (a constant built
 * from an import, a singleton constructed at load) and the game dies on boot with
 * "Cannot access 'x' before initialization" — or, worse, reads `undefined`. Cycles
 * also hide coupling: `maps/index.ts` once pulled every map, NPC, quest handler and
 * the farm manager into anything that only wanted `mapManager`.
 *
 * Type-only imports (`import type`, `import { type X }`) are erased at build time and
 * do not count — ESLint's consistent-type-imports keeps them marked as such.
 *
 * HOW TO FIX A FAILURE
 * --------------------
 * - Importing a type? Use `import type` (ESLint's --fix does it).
 * - Importing a singleton from a barrel (`maps`, `utils/npcs`)? Import the module that
 *   defines it (`maps/MapManager`), not the barrel.
 * - Genuinely mutual? Invert one direction: pass a callback, or emit an EventBus event.
 * Only add to KNOWN_CYCLES if the members use each other strictly inside functions.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set([
  'node_modules',
  'tests',
  'dist',
  'public',
  'scripts',
  '.claude',
  '.git',
]);

/**
 * Existing cycles, accepted because every member uses the others only at call time.
 * Each entry is one strongly-connected group; a file joining a group fails the test.
 */
const KNOWN_CYCLES: string[][] = [
  // GameState's quest methods drive EventChainManager, which persists through
  // CharacterData (and inventoryManager) — both of which read gameState back.
  [
    'GameState.ts',
    'state/quests.ts',
    'utils/CharacterData.ts',
    'utils/EventChainManager.ts',
    'utils/inventoryManager.ts',
  ],
  // Loading a map registers its NPCs; NPCs read tiles (and tile colours) for collision.
  ['NPCManager.ts', 'maps/MapManager.ts', 'utils/ColorResolver.ts', 'utils/mapUtils.ts'],
  // Friendship milestones advance quests; those quests adjust friendship.
  [
    'data/questHandlers/estrangedSistersHandler.ts',
    'data/questHandlers/ghostQueenHandler.ts',
    'utils/FriendshipManager.ts',
  ],
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function resolve(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Static runtime imports/re-exports of a file (type-only and dynamic imports excluded). */
function runtimeDeps(file: string): string[] {
  const sf = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    false
  );
  const deps: string[] = [];
  for (const stmt of sf.statements) {
    let spec: string | undefined;
    if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const clause = stmt.importClause;
      if (clause?.isTypeOnly) continue;
      const named = clause?.namedBindings;
      const allTypeOnly =
        clause &&
        !clause.name &&
        named &&
        ts.isNamedImports(named) &&
        named.elements.length > 0 &&
        named.elements.every((e) => e.isTypeOnly);
      if (allTypeOnly) continue;
      spec = stmt.moduleSpecifier.text;
    } else if (
      ts.isExportDeclaration(stmt) &&
      stmt.moduleSpecifier &&
      ts.isStringLiteral(stmt.moduleSpecifier)
    ) {
      if (stmt.isTypeOnly) continue;
      const clause = stmt.exportClause;
      if (
        clause &&
        ts.isNamedExports(clause) &&
        clause.elements.length > 0 &&
        clause.elements.every((e) => e.isTypeOnly)
      ) {
        continue;
      }
      spec = stmt.moduleSpecifier.text;
    }
    const target = spec ? resolve(file, spec) : null;
    if (target) deps.push(target);
  }
  return deps;
}

/** Tarjan's strongly-connected components; returns groups with more than one file. */
function cycles(graph: Map<string, string[]>): string[][] {
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const result: string[][] = [];
  const visit = (v: string): void => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!idx.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, idx.get(w)!));
      }
    }
    if (low.get(v) === idx.get(v)) {
      const group: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        group.push(w);
      } while (w !== v);
      if (group.length > 1) result.push(group);
    }
  };
  for (const v of graph.keys()) if (!idx.has(v)) visit(v);
  return result;
}

describe('runtime import cycles', () => {
  it('has no cycles beyond the known, call-time-only ones', () => {
    const files = sourceFiles(ROOT);
    expect(files.length).toBeGreaterThan(300); // guards against a broken walk

    const graph = new Map(files.map((f) => [f, runtimeDeps(f)]));
    const found = cycles(graph).map((g) =>
      g.map((f) => path.relative(ROOT, f).split(path.sep).join('/')).sort()
    );
    const known = new Set(KNOWN_CYCLES.map((g) => [...g].sort().join(' ')));
    const unexpected = found.filter((g) => !known.has(g.join(' ')));

    expect(
      unexpected,
      `New runtime import cycle(s) — see the header of tests/importCycles.test.ts:\n` +
        unexpected.map((g) => `  [${g.join(', ')}]`).join('\n')
    ).toEqual([]);
  });
});
