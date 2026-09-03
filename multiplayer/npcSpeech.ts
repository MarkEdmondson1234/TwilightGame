/**
 * What NPCs are saying, so a player standing nearby can follow along — pure,
 * no Firebase imports.
 *
 * Talking to an NPC used to be entirely private: the other player saw you
 * standing still in front of Mushra with no idea what was going on. A snippet
 * above the NPC's head turns that into something you can wander over and join.
 *
 * Deliberately *not* the whole conversation. A line is a glimpse, not a
 * transcript: enough to know what is being talked about, short enough not to
 * cover the map, and gone in a few seconds.
 */

/** How long an NPC's line floats above their head. */
export const NPC_SPEECH_DURATION_MS = 9000;

/**
 * Longest snippet shown. NPC dialogue runs far longer than a player's 140
 * characters — an AI reply can be a paragraph — so this elides hard on purpose.
 * The player in the conversation has the dialogue box; everyone else is
 * glancing over.
 */
export const MAX_NPC_SPEECH_CHARS = 90;

/** One NPC line as it goes on the wire, at `npcSpeech/{mapId}/{npcId}`. */
export interface NpcSpeechWire {
  /** The line, already truncated by the sender */
  m: string;
  /** Server timestamp */
  t: number;
  /** Who was talking to them — so the speaker's own client can skip it */
  u: string;
}

interface NpcSpeechState {
  text: string;
  startedAt: number;
  /** uid of the player whose conversation this is */
  speakerUid: string;
}

/** Cut a line down to a glimpse, breaking at a word where it can. */
export function truncateNpcSpeech(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= MAX_NPC_SPEECH_CHARS) return cleaned;

  const cut = cleaned.slice(0, MAX_NPC_SPEECH_CHARS - 1);
  const lastSpace = cut.lastIndexOf(' ');
  // Only break at a word if that does not throw most of the line away.
  const body = lastSpace > MAX_NPC_SPEECH_CHARS * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body}…`;
}

/** Validate an inbound record — a malformed one must be ignored, never crash. */
export function decodeNpcSpeech(raw: unknown): NpcSpeechWire | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.m !== 'string') return null;

  const text = truncateNpcSpeech(d.m);
  if (!text) return null;

  return {
    m: text,
    t: typeof d.t === 'number' ? d.t : 0,
    u: typeof d.u === 'string' ? d.u : '',
  };
}

class NpcSpeechManager {
  private speech = new Map<string, NpcSpeechState>();
  private mapId: string | null = null;

  getMapId(): string | null {
    return this.mapId;
  }

  /** Switch maps. Conversations do not carry between them. */
  setMap(mapId: string | null): void {
    if (this.mapId === mapId) return;
    this.speech.clear();
    this.mapId = mapId;
  }

  /** Show a line above an NPC. */
  apply(npcId: string, wire: NpcSpeechWire, now: number = Date.now()): void {
    this.speech.set(npcId, {
      text: wire.m,
      startedAt: now,
      speakerUid: wire.u,
    });
  }

  remove(npcId: string): void {
    this.speech.delete(npcId);
  }

  clear(): void {
    this.speech.clear();
  }

  /**
   * What this NPC is saying, or null.
   *
   * `localUid` is skipped deliberately: the player having the conversation is
   * reading it in the dialogue box, and a bubble repeating it behind the box is
   * clutter.
   */
  getSpeech(npcId: string, localUid: string | null, now: number = Date.now()): string | null {
    const state = this.speech.get(npcId);
    if (!state) return null;

    if (now - state.startedAt > NPC_SPEECH_DURATION_MS) {
      this.speech.delete(npcId);
      return null;
    }

    if (localUid && state.speakerUid === localUid) return null;
    return state.text;
  }
}

export const npcSpeechManager = new NpcSpeechManager();
