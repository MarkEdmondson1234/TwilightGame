/**
 * Character Outfit (costume) tests.
 *
 * Covers the whole costume pipeline in one file:
 * - the registry's resolver (saved data and remote players can carry anything —
 *   a bad outfit id must degrade to the base art, never 404)
 * - sprite path building for a worn costume (and the 3x scale detector, whose
 *   silent failure mode is documented in tests/characterSpriteScale.test.ts)
 * - the wire: a costume travels as `o`, everyday omits it, junk degrades
 * - the closed vocabulary: database.rules.json and the registry cannot drift
 *   (same pattern as tests/emoteVocabulary.test.ts)
 * - every URL the config can produce resolves to a real optimised file
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_OUTFIT,
  allOutfitIds,
  getOutfits,
  getSpriteDir,
  isValidOutfitId,
  resolveOutfit,
} from '../utils/characterOutfits';
import {
  generateCharacterSprites,
  getSpriteConfig,
  isCustomCharacterSprite,
  DEFAULT_CHARACTER,
} from '../utils/characterSprites';
import { getCharacterSpriteUrls } from '../utils/assetPreloader';
import { encodePresence, decodePresence } from '../multiplayer/wire';
import { Direction } from '../types';

const DIRECTIONS = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

describe('outfit resolver', () => {
  it('keeps a costume that exists for the character', () => {
    expect(resolveOutfit('character2', 'polka_dress')).toBe('polka_dress');
  });

  it('falls back to everyday for anything unsafe', () => {
    expect(resolveOutfit('character2', undefined)).toBe(DEFAULT_OUTFIT);
    expect(resolveOutfit('character2', null)).toBe(DEFAULT_OUTFIT);
    expect(resolveOutfit('character2', '')).toBe(DEFAULT_OUTFIT);
    expect(resolveOutfit('character2', DEFAULT_OUTFIT)).toBe(DEFAULT_OUTFIT);
    expect(resolveOutfit('character2', 'nonexistent')).toBe(DEFAULT_OUTFIT);
    // A costume id that belongs to a different character is not wearable.
    expect(resolveOutfit('character1', 'polka_dress')).toBe(DEFAULT_OUTFIT);
  });

  it('maps the base art and costumes to their directories', () => {
    expect(getSpriteDir('character2', DEFAULT_OUTFIT)).toBe('character2/base');
    expect(getSpriteDir('character2', 'polka_dress')).toBe(
      'character2/outfits/polka_dress'
    );
  });

  it('recognises costume ids for the wire but not "everyday"', () => {
    expect(isValidOutfitId('polka_dress')).toBe(true);
    expect(isValidOutfitId(DEFAULT_OUTFIT)).toBe(false);
    expect(isValidOutfitId('character1')).toBe(false);
  });
});

describe('sprite paths for a worn costume', () => {
  const dress = generateCharacterSprites({
    ...DEFAULT_CHARACTER,
    characterId: 'character2',
    outfit: 'polka_dress',
  });

  it('builds frame URLs under the costume directory', () => {
    for (const direction of DIRECTIONS) {
      for (const url of dress[direction]) {
        expect(url).toContain('/character2/outfits/polka_dress/');
      }
    }
  });

  it('is recognised as custom artwork so it renders at 3x', () => {
    for (const direction of DIRECTIONS) {
      for (const url of dress[direction]) {
        expect(
          isCustomCharacterSprite(url),
          `"${url}" was not recognised as custom character artwork — the player ` +
            'would render a third of its intended size, with nothing throwing. ' +
            'See isCustomCharacterSprite() in utils/characterSprites.ts.'
        ).toBe(true);
      }
    }
  });

  it('uses the costume frame counts, not the base art counts', () => {
    // character2's base art has 4-frame sides; the dress ships 2-frame sides.
    expect(getSpriteConfig('character2').frameCounts.left).toBe(4);
    expect(getSpriteConfig('character2', 'polka_dress').frameCounts.left).toBe(2);

    const leftFrames = dress[Direction.Left];
    expect(leftFrames.length).toBe(2);
    expect(leftFrames[0]).toContain('left_0.png');
    expect(leftFrames[1]).toContain('left_1.png');
  });

  it('does not disturb the base art when no outfit is set', () => {
    const base = generateCharacterSprites({
      ...DEFAULT_CHARACTER,
      characterId: 'character2',
    });
    expect(base[Direction.Down][0]).toContain('/character2/base/down_0.png');
  });
});

describe('presence wire: the `o` costume field', () => {
  const baseState = {
    name: 'Test',
    characterId: 'character2',
    position: { x: 10, y: 10 },
    direction: Direction.Down,
    sizeTier: 0,
    fairyForm: false,
    emote: null,
  };

  it('round-trips a costume over the wire', () => {
    const wire = encodePresence({ ...baseState, outfit: 'polka_dress' });
    expect(wire.o).toBe('polka_dress');
    const decoded = decodePresence({ ...wire, t: 123 });
    expect(decoded?.o).toBe('polka_dress');
  });

  it('omits the field for everyday players', () => {
    const everyday = encodePresence({ ...baseState, outfit: DEFAULT_OUTFIT });
    expect(everyday.o).toBeNull();
    const noOutfit = encodePresence(baseState);
    expect(noOutfit.o).toBeNull();
  });

  it('degrades an unknown costume to null on encode and decode', () => {
    const encoded = encodePresence({ ...baseState, outfit: 'wizard_robes' });
    expect(encoded.o).toBeNull();

    const decoded = decodePresence({ ...encoded, o: 'hacker_text' });
    expect(decoded?.o).toBeNull();
  });

  it('reads old records that never had an outfit field', () => {
    const decoded = decodePresence({ ...encodePresence(baseState), o: undefined });
    expect(decoded?.o).toBeNull();
  });
});

describe('outfit vocabulary: code and security rules cannot drift', () => {
  const rulesPath = join(__dirname, '..', 'database.rules.json');
  const rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));

  function outfitRuleExpression(): string {
    const expression = rules?.rules?.presence?.$mapId?.$uid?.o?.['.validate'];
    expect(
      typeof expression,
      'database.rules.json has no validate rule for presence/$mapId/$uid/o — ' +
        'without it any string can be published as a costume'
    ).toBe('string');
    return expression as string;
  }

  function outfitIdsInRules(): string[] {
    // Literals other than the null allowance, e.g. 'polka_dress'.
    return [...outfitRuleExpression().matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }

  it('lists exactly the same costume ids in the registry and the rules', () => {
    const inCode = allOutfitIds().sort();
    const inRules = outfitIdsInRules().sort();

    const missingFromRules = inCode.filter((id) => !inRules.includes(id));
    const missingFromCode = inRules.filter((id) => !inCode.includes(id));

    expect(
      missingFromRules,
      'Costume ids registered in utils/characterOutfits.ts but missing from ' +
        'database.rules.json — the rules will REJECT the whole presence write ' +
        'for anyone wearing one, hiding them from other players. Add them to ' +
        'the `o` validation.'
    ).toEqual([]);
    expect(
      missingFromCode,
      'Costume ids allowed by database.rules.json but not registered in ' +
        'utils/characterOutfits.ts — the closed vocabulary has a hole. Remove ' +
        'them from the rules or register the costume.'
    ).toEqual([]);
  });

  it('allows null, so clients that never send a costume still pass validation', () => {
    expect(outfitRuleExpression()).toContain('null');
  });
});

describe('every sprite URL the outfit config produces resolves to a file', () => {
  it('base sets and costume sets all exist in assets-optimized', () => {
    const failures: string[] = [];
    const check = (characterId: string, outfit?: string) => {
      for (const url of getCharacterSpriteUrls(characterId, outfit)) {
        const filePath = join(__dirname, '..', 'public', url.replace('/TwilightGame/', ''));
        if (!existsSync(filePath)) failures.push(url);
      }
    };

    check('character1');
    check('character2');
    for (const outfit of allOutfitIds()) {
      check('character2', outfit);
    }

    expect(
      failures,
      'These sprite URLs are generated from the character/outfit configs but ' +
        'have no file in public/assets-optimized/ — a mistyped frame count, a ' +
        'renamed file, or a missed `npm run optimize-assets`.'
    ).toEqual([]);
  });
});

describe('outfit registry sanity', () => {
  it('gives every costume an icon that exists (the creator chip needs one)', () => {
    const failures: string[] = [];
    for (const characterId of ['character1', 'character2']) {
      for (const outfit of getOutfits(characterId)) {
        if (!outfit.iconUrl) {
          failures.push(`${characterId}/${outfit.id}: no iconUrl`);
          continue;
        }
        const filePath = join(
          __dirname,
          '..',
          'public',
          outfit.iconUrl.replace('/TwilightGame/', '')
        );
        if (!existsSync(filePath)) failures.push(`${characterId}/${outfit.id}: ${outfit.iconUrl}`);
      }
    }
    expect(
      failures,
      'Costumes without a resolvable icon render a broken image on their ' +
        'character-creator chip.'
    ).toEqual([]);
  });
});