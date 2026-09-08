/**
 * @vitest-environment node
 *
 * The gift name cap lives in two places on purpose — the client sanitiser and
 * firestore.rules — for the same reason chat's does: the server-side rule is
 * the only one that holds against a client with an open dev console, and it is
 * worthless once it drifts from the value the client believes in.
 *
 * The shape check matters more here than for chat, because a gift is the one
 * shared document that turns into an *item in somebody's bag*. A rule that
 * stopped requiring a recipient would let anyone write undeliverable junk into
 * a collection every client polls.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GIFT_MAX_NAME_LENGTH } from '../multiplayer/gifts';

const rules = readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf-8');
const validator = rules.match(/function isValidGift\(\)\s*\{([\s\S]*?)\n {4}\}/)?.[1];

describe('gift security rules', () => {
  it('has an isValidGift validator', () => {
    expect(
      validator,
      'No isValidGift() in firestore.rules. Without it a gift document is ' +
        'unvalidated, or — if the match block is missing too — every send is denied.'
    ).toBeTruthy();
  });

  it('guards the gifts collection with it, readable only by signed-in players', () => {
    const block = rules.match(
      /match \/shared\/world\/gifts\/\{giftId\} \{([\s\S]*?)\n {4}\}/
    )?.[1];
    expect(block, 'No match block for shared/world/gifts in firestore.rules').toBeTruthy();
    expect(block).toContain('allow read: if isAuthenticated();');
    expect(block).toContain('isValidGift()');
    // The recipient deletes the document as the delivery receipt.
    expect(block).toContain('allow delete: if isAuthenticated();');
  });

  it('requires the three fields a gift cannot be delivered without', () => {
    expect(validator).toContain("hasAll(['f', 'r', 'i'])");
  });

  it('enforces the same name cap as GIFT_MAX_NAME_LENGTH', () => {
    const caps = [...(validator ?? '').matchAll(/size\(\) <= (\d+)/g)].map((m) => Number(m[1]));
    expect(
      caps.length,
      'Expected a length cap on both display names (n and rn) in isValidGift()'
    ).toBe(2);
    for (const cap of caps) {
      expect(
        cap,
        `firestore.rules caps gift names at ${cap} but multiplayer/gifts.ts uses ` +
          `GIFT_MAX_NAME_LENGTH = ${GIFT_MAX_NAME_LENGTH}. The server-side rule is the ` +
          'one that holds; update both together.'
      ).toBe(GIFT_MAX_NAME_LENGTH);
    }
  });
});
