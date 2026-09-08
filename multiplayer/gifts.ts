/**
 * Player-to-player gifts — pure encoding, no Firebase imports.
 *
 * Right-clicking the other player offers "Give a Gift", the same gesture NPCs
 * have had all along. The gift itself is one item, removed from the giver's
 * inventory the moment the send is accepted and added to the recipient's the
 * moment it arrives.
 *
 * Transport is Firestore (`shared/world/gifts`), not the Realtime Database
 * where chat and presence live, because a gift is durable state rather than
 * conversation: if the recipient is mid-map-transition or briefly offline the
 * gift must still be there when they come back. The recipient consumes the
 * document on receipt, so a gift is delivered exactly once.
 *
 * Gifts are addressed to one player by uid — right-clicking a specific person
 * is who it is for — but any signed-in player can read the collection, the
 * same bargain every shared world collection makes. Clients filter by
 * recipient rather than the rules enforcing privacy, matching how placedItems
 * filters by mapId.
 */

/** Longest display name carried on a gift. Same cap as chat names. */
export const GIFT_MAX_NAME_LENGTH = 20;

/** One gift as stored at `shared/world/gifts/{giftId}`. */
export interface GiftWire {
  /** Giver uid */
  f: string;
  /** Giver display name at send time */
  n: string;
  /** Recipient uid */
  r: string;
  /** Recipient display name at send time (display only — routing is by uid) */
  rn: string;
  /** Item being given */
  i: string;
  /**
   * Decoration artwork linked to this item instance (crafted wreaths, framed
   * paintings). The image itself lives in `shared/world/paintings/{decorationId}`;
   * the recipient fetches it when they need to see or place the item.
   */
  d?: string;
  /** Server timestamp */
  t: number;
}

/** A gift as the UI sees it. */
export interface Gift {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  itemId: string;
  decorationId?: string;
  sentAt: number;
}

/** Clean a display name — same rules as chat's `n` field. */
export function sanitiseGiftName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, GIFT_MAX_NAME_LENGTH);
}

/**
 * Validate an outbound gift. Returns null for anything not worth publishing,
 * which callers treat as "do not send" — a gift without a recipient or item
 * would be undeliverable junk in a collection real clients poll.
 */
export function encodeGift(raw: {
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  itemId: string;
  decorationId?: string;
}): GiftWire | null {
  if (!raw.fromUid || !raw.toUid || !raw.itemId) return null;
  const wire: GiftWire = {
    f: raw.fromUid,
    n: sanitiseGiftName(raw.fromName) || 'Traveller',
    r: raw.toUid,
    rn: sanitiseGiftName(raw.toName) || 'Traveller',
    i: raw.itemId,
    t: 0, // replaced with the send time by the transport
  };
  if (raw.decorationId) wire.d = raw.decorationId;
  return wire;
}

/**
 * Validate an inbound record. The security rules enforce this shape too, but
 * rules can lag a deploy and a malformed gift must degrade to "ignore it"
 * rather than to a crash mid-render.
 */
export function decodeGift(id: string, raw: unknown, localUid: string | null): Gift | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;

  if (typeof d.f !== 'string' || !d.f) return null;
  if (typeof d.r !== 'string' || !d.r) return null;
  if (typeof d.i !== 'string' || !d.i) return null;

  // Addressed to one player. A gift for somebody else is not ours to open —
  // the transport hands us every document in the collection.
  if (localUid && d.r !== localUid) return null;

  return {
    id,
    fromUid: d.f,
    fromName: sanitiseGiftName(d.n) || 'Traveller',
    toUid: d.r,
    toName: sanitiseGiftName(d.rn) || 'Traveller',
    itemId: d.i,
    ...(typeof d.d === 'string' && d.d ? { decorationId: d.d } : {}),
    sentAt: typeof d.t === 'number' ? d.t : 0,
  };
}