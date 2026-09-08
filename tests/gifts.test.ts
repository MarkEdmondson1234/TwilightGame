/**
 * @vitest-environment node
 *
 * Player-to-player gifts. The wire codec is the whole trust boundary here: a
 * gift is a document any signed-in player can write, and every client in the
 * world reads the collection. Two things must hold whatever lands in it.
 *
 * The first is that a gift addressed to somebody else is never opened. The
 * transport hands each client every document, so recipient filtering is
 * `decodeGift`'s job, not the query's — get it wrong and two players racing
 * for the same turnip both receive it.
 *
 * The second is that a malformed record degrades to "ignore it" rather than to
 * a crash mid-render, because the security rules can lag a deploy.
 */
import { describe, it, expect } from 'vitest';
import {
  encodeGift,
  decodeGift,
  sanitiseGiftName,
  GIFT_MAX_NAME_LENGTH,
} from '../multiplayer/gifts';

const validGift = {
  fromUid: 'uid-giver',
  fromName: 'Rosie',
  toUid: 'uid-recipient',
  toName: 'Sanne',
  itemId: 'crop_turnip',
};

describe('encodeGift', () => {
  it('encodes a plain gift', () => {
    const wire = encodeGift(validGift);
    expect(wire).toEqual({
      f: 'uid-giver',
      n: 'Rosie',
      r: 'uid-recipient',
      rn: 'Sanne',
      i: 'crop_turnip',
      t: 0,
    });
  });

  it('carries the artwork id for a crafted wreath, and omits it otherwise', () => {
    expect(encodeGift({ ...validGift, decorationId: 'dec_1' })?.d).toBe('dec_1');
    // Omitted rather than undefined: Firestore rejects undefined field values.
    expect(encodeGift(validGift)).not.toHaveProperty('d');
  });

  it.each([
    ['no recipient', { ...validGift, toUid: '' }],
    ['no giver', { ...validGift, fromUid: '' }],
    ['no item', { ...validGift, itemId: '' }],
  ])('refuses to publish a gift with %s', (_label, raw) => {
    expect(encodeGift(raw)).toBeNull();
  });

  it('falls back to a name rather than publishing an empty one', () => {
    const wire = encodeGift({ ...validGift, fromName: '   ', toName: '' });
    expect(wire?.n).toBe('Traveller');
    expect(wire?.rn).toBe('Traveller');
  });

  it('caps names at GIFT_MAX_NAME_LENGTH, as the security rules do', () => {
    const wire = encodeGift({ ...validGift, fromName: 'x'.repeat(200) });
    expect(wire?.n.length).toBe(GIFT_MAX_NAME_LENGTH);
  });
});

describe('sanitiseGiftName', () => {
  it('drops anything that is not a string', () => {
    for (const raw of [null, undefined, 42, {}, []]) {
      expect(sanitiseGiftName(raw)).toBe('');
    }
  });
});

describe('decodeGift', () => {
  const wire = encodeGift(validGift)!;

  it('opens a gift addressed to us', () => {
    const gift = decodeGift('gift-1', wire, 'uid-recipient');
    expect(gift).toMatchObject({
      id: 'gift-1',
      fromUid: 'uid-giver',
      fromName: 'Rosie',
      toUid: 'uid-recipient',
      itemId: 'crop_turnip',
    });
  });

  it('ignores a gift addressed to somebody else', () => {
    expect(decodeGift('gift-1', wire, 'uid-bystander')).toBeNull();
  });

  it.each([
    ['not an object', 'nonsense'],
    ['null', null],
    ['missing giver', { ...wire, f: undefined }],
    ['missing recipient', { ...wire, r: undefined }],
    ['missing item', { ...wire, i: '' }],
    ['a numeric item id', { ...wire, i: 7 }],
  ])('ignores a malformed record (%s) instead of throwing', (_label, raw) => {
    expect(decodeGift('gift-1', raw, 'uid-recipient')).toBeNull();
  });

  it('survives a missing timestamp and missing names', () => {
    const gift = decodeGift(
      'gift-1',
      { f: 'uid-giver', r: 'uid-recipient', i: 'crop_turnip' },
      'uid-recipient'
    );
    expect(gift?.sentAt).toBe(0);
    expect(gift?.fromName).toBe('Traveller');
    expect(gift?.toName).toBe('Traveller');
  });

  it('drops a non-string artwork id rather than passing it to the picture store', () => {
    expect(decodeGift('g', { ...wire, d: 12 }, 'uid-recipient')).not.toHaveProperty(
      'decorationId'
    );
  });
});
