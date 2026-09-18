/**
 * SharedWorldStatus — "why can't I see her?" answered on the device itself.
 *
 * Lives under Account in the F1 settings. Every one-way multiplayer fault so
 * far has come down to something only the *blind* device could have told us —
 * which build it runs, whether it is really signed in, which room it joined,
 * how far its clock is out — and that device is a child's iPad with no
 * console. So the facts are read straight from the managers and put on
 * screen, plainly enough to be read out over the phone.
 *
 * Polled while open: this is a settings page, not the HUD, and two seconds
 * of staleness is fine.
 */

import React, { useEffect, useState } from 'react';
import { getPresenceService, getAuthService, getCommunityGardenService } from '../firebase/safe';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import { PRESENCE_REASON_TEXT } from '../multiplayer/presenceStatus';
import { getServerTimeOffset, isServerTimeOffsetKnown } from '../multiplayer/serverClock';
import { MULTIPLAYER, MULTIPLAYER_ENABLED } from '../constants';

const POLL_MS = 2000;

/** Short SHA of the deploy this page came from — `dev` when running locally. */
export const BUILD_ID =
  (import.meta.env.VITE_APP_VERSION as string | undefined)?.slice(0, 7) ?? 'dev';

interface Snapshot {
  signedIn: boolean;
  uid: string | null;
  presence: string;
  presenceOk: boolean;
  room: string | null;
  friends: string[];
  traffic: string;
  trafficOk: boolean;
  clock: string;
  clockOk: boolean;
  garden: boolean;
}

function describeClock(): { text: string; ok: boolean } {
  if (!isServerTimeOffsetKnown()) return { text: 'not measured yet', ok: true };
  const offset = getServerTimeOffset();
  const seconds = Math.round(Math.abs(offset) / 1000);
  if (seconds < 2) return { text: 'in step with the server', ok: true };
  const direction = offset > 0 ? 'behind' : 'ahead of';
  return {
    text: `${seconds} s ${direction} the server`,
    ok: Math.abs(offset) <= MULTIPLAYER.CLOCK_SKEW_WARN_MS,
  };
}

function takeSnapshot(): Snapshot {
  const auth = getAuthService().getState();
  const status = getPresenceService().getStatus();
  const clock = describeClock();
  const stats = getPresenceService().getStats();
  const lastIn = stats.lastReceivedAt
    ? `${Math.round((Date.now() - stats.lastReceivedAt) / 1000)} s ago`
    : 'never';
  return {
    signedIn: auth.isAuthenticated,
    uid: auth.user?.uid ?? null,
    presence: status.available
      ? status.room
        ? `sharing "${status.room}"`
        : 'ready, but this map is private'
      : status.reason
        ? PRESENCE_REASON_TEXT[status.reason]
        : 'off',
    presenceOk: status.available,
    room: status.room,
    friends: remotePlayerManager.getNames(),
    // "in" is what other players sent us; "out" is what we sent. A friend who
    // is invisible with "in" climbing was received and lost afterwards; with
    // "in: never" they were never delivered. "nobody listening" means the
    // game never subscribed — records arrive and go nowhere.
    traffic: `in ${stats.received} (last ${lastIn}), dropped ${stats.dropped}, out ${stats.published}${
      stats.publishFailed ? `, ${stats.publishFailed} refused` : ''
    }${stats.subscribers === 0 && status.room ? ', nobody listening' : ''}`,
    trafficOk: stats.publishFailed === 0 && !(stats.subscribers === 0 && Boolean(status.room)),
    clock: clock.text,
    clockOk: clock.ok,
    garden: getCommunityGardenService().isActive(),
  };
}

interface Props {
  colours: { text: string; textLight: string; wood: string };
}

const SharedWorldStatus: React.FC<Props> = ({ colours }) => {
  const [snapshot, setSnapshot] = useState<Snapshot>(takeSnapshot);

  useEffect(() => {
    const id = window.setInterval(() => setSnapshot(takeSnapshot()), POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!MULTIPLAYER_ENABLED) return null;

  const rows: Array<{ label: string; value: string; ok: boolean }> = [
    { label: 'Build', value: BUILD_ID, ok: true },
    {
      label: 'Signed in',
      value: snapshot.signedIn ? `yes (${snapshot.uid?.slice(0, 6)}…)` : 'no',
      ok: snapshot.signedIn,
    },
    { label: 'Presence', value: snapshot.presence, ok: snapshot.presenceOk },
    {
      label: 'Friends here',
      value: snapshot.friends.length ? snapshot.friends.join(', ') : 'nobody',
      ok: true,
    },
    { label: 'Records', value: snapshot.traffic, ok: snapshot.trafficOk },
    { label: 'Clock', value: snapshot.clock, ok: snapshot.clockOk },
    {
      label: 'Shared garden',
      value: snapshot.garden ? 'listening' : 'not listening',
      ok: snapshot.garden || !snapshot.room,
    },
  ];

  return (
    <div
      data-testid="shared-world-status"
      className="rounded p-3 mt-4 text-sm font-serif"
      style={{ background: 'rgba(139, 115, 85, 0.1)', border: `1px solid ${colours.wood}` }}
    >
      <div className="font-semibold mb-1" style={{ color: colours.text }}>
        🧑‍🤝‍🧑 Shared world
      </div>
      <dl className="grid gap-x-3 gap-y-0.5" style={{ gridTemplateColumns: 'max-content 1fr' }}>
        {rows.map((row) => (
          <React.Fragment key={row.label}>
            <dt style={{ color: colours.textLight }}>{row.label}</dt>
            <dd style={{ color: row.ok ? colours.text : '#8b4444' }}>{row.value}</dd>
          </React.Fragment>
        ))}
      </dl>
      <p className="mt-2 text-xs" style={{ color: colours.textLight }}>
        If a friend can see you but you cannot see them, read these lines out to whoever is helping.
        Anything in red is the reason.
      </p>
    </div>
  );
};

export default SharedWorldStatus;
