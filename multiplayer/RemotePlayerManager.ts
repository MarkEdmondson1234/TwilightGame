/**
 * RemotePlayerManager — single source of truth for other players.
 *
 * Deliberately shaped like NPCManager: the renderer asks it "who is on this map
 * and where are they", and it owns everything else — interpolation buffers,
 * walk-cycle derivation, emote expiry and staleness eviction.
 *
 * It is fed by presenceService but knows nothing about Firebase, so it can be
 * driven from a test with hand-written snapshots and a fake clock.
 *
 * Positions are NOT pushed through React. The Pixi layer polls this manager
 * once per frame from the game loop; only join/leave/emote — which are rare and
 * do change UI — go out on the EventBus.
 */

import { Direction } from '../types';
import type { Position } from '../types';
import { MULTIPLAYER, DEBUG } from '../constants';
import { eventBus, GameEvent } from '../utils/EventBus';
import { interpolateAt, pushSample } from './interpolation';
import { decodeDirection } from './wire';
import type { EmoteId } from './emotes';
import type { PresenceSample, PresenceWire, RemotePlayer } from './types';

interface RemotePlayerState {
  uid: string;
  name: string;
  characterId: string;
  sizeTier: number;
  fairyForm: boolean;
  emote: EmoteId | null;
  emoteStartedAt: number;
  /** Recent position samples, oldest first, on the local clock */
  buffer: PresenceSample[];
  /** Local clock at last received update — the basis for staleness eviction */
  lastSeenAt: number;
  // ---- Render state, recomputed every tick ----
  position: Position;
  direction: Direction;
  /** Tiles travelled since the walk frame last advanced */
  animAccumulator: number;
  animStep: number;
  isMoving: boolean;
}

class RemotePlayerManagerClass {
  private players = new Map<string, RemotePlayerState>();
  private mapId: string | null = null;

  /** The map whose presence room we are currently mirroring. */
  getMapId(): string | null {
    return this.mapId;
  }

  /**
   * Switch rooms. Everything is dropped: presence is per-map, and a player we
   * saw in the village tells us nothing about who is in the orchard.
   */
  setMap(mapId: string | null): void {
    if (this.mapId === mapId) return;
    this.clear();
    this.mapId = mapId;
  }

  /** Apply an inbound presence record for one player. */
  apply(uid: string, wire: PresenceWire, now: number = Date.now()): void {
    const direction = decodeDirection(wire.d) ?? Direction.Down;
    const position: Position = { x: wire.x, y: wire.y };
    const sample: PresenceSample = { position, direction, receivedAt: now };

    let state = this.players.get(uid);

    if (!state) {
      state = {
        uid,
        name: wire.n,
        characterId: wire.c,
        sizeTier: wire.s,
        fairyForm: wire.ff,
        emote: null,
        emoteStartedAt: 0,
        buffer: [sample],
        lastSeenAt: now,
        position,
        direction,
        animAccumulator: 0,
        animStep: 0,
        isMoving: false,
      };
      this.players.set(uid, state);
      if (DEBUG.MULTIPLAYER) console.log(`[Multiplayer] ${wire.n} joined (${uid})`);
      eventBus.emit(GameEvent.REMOTE_PLAYER_JOINED, { uid, name: wire.n });
    } else {
      state.name = wire.n;
      state.characterId = wire.c;
      state.sizeTier = wire.s;
      state.fairyForm = wire.ff;
      state.buffer = pushSample(state.buffer, sample, MULTIPLAYER.SAMPLE_BUFFER_SIZE);
      state.lastSeenAt = now;
    }

    // A repeat of the same emote id is a *new* emote — the sender restarted it,
    // so restart the timer rather than letting the old one expire mid-wave.
    if (wire.e !== null && (state.emote !== wire.e || now - state.emoteStartedAt > 250)) {
      state.emote = wire.e;
      state.emoteStartedAt = now;
      eventBus.emit(GameEvent.REMOTE_PLAYER_EMOTED, { uid, name: state.name, emote: wire.e });
    } else if (wire.e === null) {
      state.emote = null;
    }
  }

  /** Drop a player who left the room (their presence record was removed). */
  remove(uid: string): void {
    const state = this.players.get(uid);
    if (!state) return;
    this.players.delete(uid);
    if (DEBUG.MULTIPLAYER) console.log(`[Multiplayer] ${state.name} left (${uid})`);
    eventBus.emit(GameEvent.REMOTE_PLAYER_LEFT, { uid, name: state.name });
  }

  /**
   * Advance interpolation, walk cycles and expiries. Called once per frame from
   * the game loop.
   */
  tick(now: number = Date.now()): void {
    const renderTime = now - MULTIPLAYER.INTERPOLATION_DELAY_MS;

    for (const [uid, state] of this.players) {
      // onDisconnect() handles the common cases; this is the backstop for a
      // client whose socket never actually closed (suspended laptop, dead Wi-Fi).
      if (now - state.lastSeenAt > MULTIPLAYER.STALE_AFTER_MS) {
        this.remove(uid);
        continue;
      }

      if (state.emote && now - state.emoteStartedAt > MULTIPLAYER.EMOTE_DURATION_MS) {
        state.emote = null;
      }

      const result = interpolateAt(state.buffer, renderTime, {
        snapDistanceTiles: MULTIPLAYER.SNAP_DISTANCE_TILES,
        bufferSize: MULTIPLAYER.SAMPLE_BUFFER_SIZE,
      });
      if (!result) continue;

      const dx = result.position.x - state.position.x;
      const dy = result.position.y - state.position.y;
      const travelled = Math.sqrt(dx * dx + dy * dy);

      state.position = result.position;
      state.direction = result.direction;
      state.isMoving = result.speed > MULTIPLAYER.IDLE_SPEED_TILES_PER_SEC;

      // The walk cycle is driven by distance covered, not by a timer and not by
      // a frame index sent over the wire. The legs move because the character
      // moved, so the animation stays in step at any update rate.
      if (state.isMoving) {
        state.animAccumulator += travelled;
        while (state.animAccumulator >= MULTIPLAYER.ANIM_TILES_PER_FRAME) {
          state.animAccumulator -= MULTIPLAYER.ANIM_TILES_PER_FRAME;
          state.animStep++;
        }
      } else {
        state.animAccumulator = 0;
      }
    }
  }

  /** Everyone currently visible, for the renderer. */
  getRemotePlayers(): RemotePlayer[] {
    const out: RemotePlayer[] = [];
    for (const state of this.players.values()) {
      out.push({
        uid: state.uid,
        name: state.name,
        characterId: state.characterId,
        position: state.position,
        direction: state.direction,
        sizeTier: state.sizeTier,
        fairyForm: state.fairyForm,
        animStep: state.animStep,
        isMoving: state.isMoving,
        emote: state.emote,
      });
    }
    return out;
  }

  /** How many other players are here — drives the HUD indicator. */
  getCount(): number {
    return this.players.size;
  }

  /** Names of everyone here, for the HUD tooltip. */
  getNames(): string[] {
    return [...this.players.values()].map((p) => p.name);
  }

  /** Forget everyone without emitting leave events (map change, shutdown). */
  clear(): void {
    this.players.clear();
  }
}

export const remotePlayerManager = new RemotePlayerManagerClass();
