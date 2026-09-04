/**
 * Splash Scene Tests — the splash backdrop must composite the full seasonal
 * cutscene layer stack, and that stack must stay in sync with the cutscenes.
 *
 * WHY THIS EXISTS
 * ---------------
 * The splash originally reused only each cutscene's *bottom* background layer
 * (issue #97). Those bare background files have empty space that the layers
 * above them were drawn to fill, so the title screen showed visibly
 * incomplete artwork. Nothing failed — it just looked broken.
 *
 * WHAT BREAKS IF THESE FAIL
 * -------------------------
 * 1. "layers" assertion: the splash shows a bare/incomplete backdrop again.
 * 2. "file exists" assertion: a splash layer 404s at runtime and renders as
 *    nothing (same silent-failure class tests/assetIntegrity.test.ts guards).
 * 3. "matches the cutscene" assertion: the splash and the season cutscenes
 *    have drifted — the splash no longer shows the scene players recognise
 *    from the season change.
 *
 * HOW TO FIX A FAILURE
 * --------------------
 * Edit utils/splashScenes.ts (the splash's stack) to match the panorama
 * scene in data/cutscenes/seasonChange.ts, or update PANORAMA_SCENE_IDS /
 * the expected scene id if the cutscene was intentionally redesigned — then
 * re-run `npx vitest run tests/splashScenes.test.ts`.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Season } from '../utils/TimeManager';
import {
  SEASON_SCENES,
  PANORAMA_SCENE_IDS,
  CUTSCENE_DIR,
  SplashLayer,
} from '../utils/splashScenes';
import type { CutsceneDefinition } from '../types';
import {
  springCutscene,
  summerCutscene,
  autumnCutscene,
  winterCutscene,
} from '../data/cutscenes/seasonChange';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');

const BASE_PREFIX = '/TwilightGame/';

/** Convert a runtime asset URL to an absolute path under `public/`. */
function toDiskPath(assetUrl: string): string {
  return path.join(PUBLIC_DIR, assetUrl.slice(BASE_PREFIX.length));
}

const ALL_SEASONS = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];

/** The seasonChange.ts cutscene whose panorama scene each splash stack mirrors. */
const SEASON_CUTSCENES: Record<Season, CutsceneDefinition> = {
  [Season.SPRING]: springCutscene,
  [Season.SUMMER]: summerCutscene,
  [Season.AUTUMN]: autumnCutscene,
  [Season.WINTER]: winterCutscene,
};

/** (image, zIndex) pairs of a cutscene scene's backgroundLayers, sorted bottom→top. */
function cutsceneStack(season: Season): SplashLayer[] {
  const sceneId = PANORAMA_SCENE_IDS[season];
  const scene = SEASON_CUTSCENES[season].scenes.find((s) => s.id === sceneId);
  expect(
    scene,
    `seasonChange.ts has no scene '${sceneId}' for ${season} — PANORAMA_SCENE_IDS is stale`
  ).toBeDefined();
  return scene!.backgroundLayers
    .map((l) => ({ image: l.image, zIndex: l.zIndex }))
    .sort((a, b) => a.zIndex - b.zIndex);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('splash screen seasonal backdrop', () => {
  it('composites more than one layer per season (a bare background was issue #97)', () => {
    const problems: string[] = [];
    for (const season of ALL_SEASONS) {
      if (SEASON_SCENES[season].length < 2) {
        problems.push(`${season} has only ${SEASON_SCENES[season].length} layer`);
      }
    }
    expect(problems, problems.join('; ')).toEqual([]);
  });

  it('every splash layer file resolves on disk (case-sensitive)', () => {
    const missing: string[] = [];
    for (const season of ALL_SEASONS) {
      for (const layer of SEASON_SCENES[season]) {
        const diskPath = toDiskPath(`${CUTSCENE_DIR}${layer.image}`);
        if (!fs.existsSync(diskPath)) {
          missing.push(`${season}: ${layer.image} → ${diskPath}`);
        }
      }
    }
    expect(missing, missing.join('; ')).toEqual([]);
  });

  it('each season stack matches its seasonChange.ts panorama scene (no drift)', () => {
    const problems: string[] = [];
    for (const season of ALL_SEASONS) {
      const splashStack = [...SEASON_SCENES[season]].sort((a, b) => a.zIndex - b.zIndex);
      const cutscene = cutsceneStack(season);
      const splashSig = JSON.stringify(splashStack);
      const cutsceneSig = JSON.stringify(cutscene);
      if (splashSig !== cutsceneSig) {
        problems.push(
          `${season}: splash stack ${splashSig} ≠ ${PANORAMA_SCENE_IDS[season]} scene ${cutsceneSig}`
        );
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  it('every season is covered — no season can fall back to another season silently', () => {
    for (const season of ALL_SEASONS) {
      expect(SEASON_SCENES[season], `No splash scene defined for ${season}`).toBeDefined();
    }
  });
});
