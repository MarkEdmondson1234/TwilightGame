/**
 * @vitest-environment node
 *
 * The safety-critical test in the multiplayer feature.
 *
 * Emotes are the only channel between players, and the reason that is safe is
 * that the vocabulary is *closed*: a player with the dev console open still
 * cannot publish anything that is not on the list, because the Realtime
 * Database rules enumerate the allowed values server-side.
 *
 * That means the list exists twice — once in multiplayer/emotes.ts and once in
 * database.rules.json — and if the two ever drift, the guarantee quietly
 * evaporates. Add an emote to the code and forget the rules and it silently
 * stops working; add one to the rules and forget the code and the closed
 * vocabulary has a hole in it. This test makes either mistake loud.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EMOTE_IDS, EMOTES, isEmoteId } from '../multiplayer/emotes';

const rulesPath = join(__dirname, '..', 'database.rules.json');
const rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));

/** The `e` field's validate expression, e.g. "newData.val() === null || ..." */
function emoteRuleExpression(): string {
  const expression = rules?.rules?.presence?.$mapId?.$uid?.e?.['.validate'];
  expect(
    typeof expression,
    'database.rules.json has no validate rule for presence/$mapId/$uid/e — ' +
      'without it any string can be published as an emote'
  ).toBe('string');
  return expression as string;
}

/** Pull every 'literal' out of the rule expression. */
function emoteIdsInRules(): string[] {
  const matches = emoteRuleExpression().matchAll(/'([^']+)'/g);
  return [...matches].map((match) => match[1]);
}

describe('emote vocabulary', () => {
  it('lists exactly the same ids in the code and the security rules', () => {
    const inCode: string[] = [...EMOTE_IDS].sort();
    const inRules: string[] = emoteIdsInRules().sort();

    const missingFromRules = inCode.filter((id) => !inRules.includes(id));
    const missingFromCode = inRules.filter((id) => !inCode.includes(id));

    expect(
      { missingFromRules, missingFromCode },
      'multiplayer/emotes.ts and database.rules.json have drifted. Add the ids in ' +
        '`missingFromRules` to the "e" validate rule in database.rules.json, and remove ' +
        'the ids in `missingFromCode` from it (or add them to EMOTES).'
    ).toEqual({ missingFromRules: [], missingFromCode: [] });
  });

  it('allows null so a player can clear their emote', () => {
    expect(
      emoteRuleExpression(),
      'The "e" rule must accept null, or an expired emote can never be cleared'
    ).toContain('newData.val() === null');
  });

  it('rejects arbitrary extra keys on a presence record', () => {
    // Without this rule, presence becomes an unmoderated free-text channel by
    // the back door, which defeats the whole closed-vocabulary design.
    expect(
      rules?.rules?.presence?.$mapId?.$uid?.$other?.['.validate'],
      'presence/$mapId/$uid must have "$other": { ".validate": false }'
    ).toBe(false);
  });

  it('only lets a player write their own presence record', () => {
    expect(rules?.rules?.presence?.$mapId?.$uid?.['.write']).toBe(
      'auth != null && auth.uid === $uid'
    );
  });

  it('forces the server clock for the freshness timestamp', () => {
    // Staleness eviction on other clients is only meaningful if a client cannot
    // lie about when it last spoke.
    expect(rules?.rules?.presence?.$mapId?.$uid?.t?.['.validate']).toBe('newData.val() === now');
  });
});

describe('emote definitions', () => {
  it('has no duplicate ids', () => {
    expect(new Set(EMOTE_IDS).size).toBe(EMOTE_IDS.length);
  });

  it('gives every emote an icon and a label', () => {
    const incomplete = EMOTES.filter((emote) => !emote.icon || !emote.label);
    expect(incomplete, 'Every emote needs an icon and a label for the picker').toEqual([]);
  });

  it('accepts only known ids through the type guard', () => {
    expect(isEmoteId('wave')).toBe(true);
    expect(isEmoteId('definitely-not-an-emote')).toBe(false);
    expect(isEmoteId(null)).toBe(false);
    expect(isEmoteId(42)).toBe(false);
  });
});
