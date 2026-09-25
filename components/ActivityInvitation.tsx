import React, { useEffect, useState, type RefObject } from 'react';
import type { Position } from '../types';
import { npcManager } from '../NPCManager';
import { TimeManager } from '../utils/TimeManager';
import { inventoryManager } from '../utils/inventoryManager';
import { getItem } from '../data/items';
import {
  ACTIVITY_LEADS,
  canSkiHere,
  getActivityCandidates,
  type ActivityLeadId,
} from '../utils/activityDiscovery';
import { hasActivityLead, rememberActivityLead } from '../utils/activityLeadStorage';
import { COTTAGE_COLOURS as colours, COTTAGE_FONTS } from '../utils/transitionIcons';
import { Z_QUEST_GUIDANCE, Z_QUEST_GUIDANCE_RAISED } from '../zIndex';
import { useIsTinyTouchScreen } from '../hooks/useIsTinyTouchScreen';
import { useTouchDevice } from '../hooks/useTouchDevice';
import './ActivityInvitation.css';

interface Props {
  mapId: string;
  playerPosition: RefObject<Position>;
  blocked: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  onTalk: (npcId: string) => void;
  onSki: () => void;
  onJournal: () => void;
}

export default function ActivityInvitation({
  mapId,
  playerPosition,
  blocked,
  onTalk,
  onVisibilityChange,
  onSki,
  onJournal,
}: Props) {
  const [candidate, setCandidate] = useState<{
    id: ActivityLeadId;
    npcId?: string;
    mapId: string;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Touch: the invitation first appears as a small pill and opens on tap. As a
  // full card it covered a third of a phone screen whenever a host was near
  // (issue #157). Desktop keeps the full card.
  const isTouchDevice = useTouchDevice();
  const isTinyScreen = useIsTinyTouchScreen();
  const [opened, setOpened] = useState(false);
  const [ownsSkis, setOwnsSkis] = useState(false);

  useEffect(() => {
    if (blocked) return;
    const check = () => {
      const nearbyNpcs = npcManager
        .getCurrentMapNPCs()
        .filter(
          (npc) =>
            npcManager.isNPCVisible(npc) &&
            Math.hypot(
              npc.position.x - playerPosition.current.x,
              npc.position.y - playerPosition.current.y
            ) <= 5
        );
      const next =
        getActivityCandidates({
          mapId,
          season: TimeManager.getCurrentTime().season,
          nearbyNpcs,
        }).find((lead) => !hasActivityLead(lead.id)) ?? null;
      setCandidate((previous) =>
        previous?.id === next?.id && previous?.npcId === next?.npcId && previous?.mapId === mapId
          ? previous
          : next
            ? { ...next, mapId }
            : null
      );
      setOwnsSkis(inventoryManager.getQuantity('tool_skis') > 0);
    };
    check();
    const timer = window.setInterval(check, 1000);
    return () => window.clearInterval(timer);
  }, [mapId, playerPosition, blocked]);

  useEffect(() => {
    setExpanded(false);
    setOpened(false);
  }, [candidate?.id]);
  const visible =
    !blocked &&
    !!candidate &&
    candidate.mapId === mapId &&
    (candidate.id !== 'skiing' || canSkiHere(mapId, TimeManager.getCurrentTime().season));
  useEffect(() => {
    onVisibilityChange?.(visible);
    return () => onVisibilityChange?.(false);
  }, [visible, onVisibilityChange]);
  if (blocked || !candidate || candidate.mapId !== mapId) return null;
  const lead = ACTIVITY_LEADS.find((entry) => entry.id === candidate.id)!;
  // Recheck at render/action time too: a season change must not leave a stale ski launch.
  if (lead.id === 'skiing' && !canSkiHere(mapId, TimeManager.getCurrentTime().season)) return null;
  const host = candidate.npcId ? npcManager.getNPCById(candidate.npcId) : undefined;
  const illustration =
    host?.portraitSprite ?? (lead.itemId ? getItem(lead.itemId)?.image : undefined);
  const remember = () => {
    rememberActivityLead(lead.id);
    setCandidate(null);
  };

  const surface = {
    zIndex: Z_QUEST_GUIDANCE,
    background: colours.parchmentLight,
    color: colours.darkBrownText,
    borderColor: colours.warmBrownBorder,
    fontFamily: COTTAGE_FONTS.body,
  };

  if (isTouchDevice && !opened) {
    return (
      <aside
        className="activity-invitation activity-invitation-pill"
        aria-label={lead.title}
        style={surface}
      >
        <button aria-expanded={false} onClick={() => setOpened(true)}>
          {illustration && <img src={illustration} alt="" />}
          <span>{lead.title}</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="activity-invitation"
      aria-label={lead.title}
      // Open on a tiny screen: over the controls, or it has no room to be read.
      style={isTinyScreen ? { ...surface, zIndex: Z_QUEST_GUIDANCE_RAISED } : surface}
    >
      <div className="activity-invitation-heading">
        {illustration && <img src={illustration} alt="" />}
        <div>
          <strong>{lead.title}</strong>
          <p>{expanded ? lead.directions : lead.invitation}</p>
        </div>
      </div>
      <div className="activity-invitation-actions">
        {!expanded && <button onClick={() => setExpanded(true)}>How do I try it?</button>}
        {candidate.npcId && (
          <button
            onClick={() => {
              remember();
              onTalk(candidate.npcId!);
            }}
          >
            Ask {host?.name ?? 'about it'}
          </button>
        )}
        {lead.id === 'skiing' && ownsSkis && (
          <button
            onClick={() => {
              remember();
              onSki();
            }}
          >
            Go Skiing
          </button>
        )}
        <button
          onClick={() => {
            remember();
            onJournal();
          }}
        >
          Save &amp; read in journal
        </button>
        <button onClick={remember}>Later</button>
        {isTouchDevice && (
          // Back to the pill without deciding: Later files the lead away for good.
          <button
            onClick={() => {
              setOpened(false);
              setExpanded(false);
            }}
          >
            Collapse
          </button>
        )}
      </div>
      <small>Kept in your journal under Things to try, even if you choose Later.</small>
    </aside>
  );
}
