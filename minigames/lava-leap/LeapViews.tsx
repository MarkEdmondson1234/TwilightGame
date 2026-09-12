import React from 'react';
import { DEFAULT_CHARACTER, generateCharacterSprites } from '../../utils/characterSprites';
import { Direction } from '../../types';
import { LavaLeapPlayer } from './LavaLeapPlayer';
import { LeapViewport } from './LeapViewport';
import { gemIndices, sharedEffects, type PlayMode, type LeapPeer } from './multiplayer';
import type { State } from './engine';
import { COURSES } from './courses';

export function LeapViews({
  frame,
  scale,
  sprite,
  playMode,
  peers,
  clock,
  name,
  stacked,
}: {
  frame: State;
  scale: number;
  sprite?: string;
  playMode: PlayMode;
  peers: LeapPeer[];
  clock: number;
  name: string;
  stacked: boolean;
}) {
  const progress = (x: number) =>
    `${Math.min(100, Math.floor((x / (COURSES[frame.courseId].width - 140)) * 100))}%`;
  const effects = playMode === 'coop' ? sharedEffects(peers, frame, clock) : undefined;
  const remotePlayers = peers
    .filter((p) => p.course === frame.courseId)
    .map((p) => {
      const frames = generateCharacterSprites({
        ...DEFAULT_CHARACTER,
        name: p.name,
        characterId: p.character,
      });
      const image = frames[p.facing > 0 ? Direction.Right : Direction.Left]?.[0];
      return (
        <div key={p.uid} className="ll-rival">
          <LavaLeapPlayer
            x={p.x}
            y={p.y}
            sprite={image}
            rescued={false}
            gliding={p.gliding}
            name={p.name}
          />
        </div>
      );
    });
  const rival = peers[0];
  const rivalSprite = rival
    ? generateCharacterSprites({
        ...DEFAULT_CHARACTER,
        name: rival.name,
        characterId: rival.character,
      })[rival.facing > 0 ? Direction.Right : Direction.Left]?.[0]
    : undefined;
  const rivalEffects = rival ? sharedEffects([rival], frame, clock) : undefined;
  const rivalFrame = rival
    ? {
        ...frame,
        x: rival.x,
        y: rival.y,
        collected: gemIndices(rival.gems, rival.course),
        checkpoint: rival.checkpoint,
        ice: rivalEffects?.ice[0] ?? null,
        sealedVent: rivalEffects?.seals[0] ?? null,
        glide: rival.gliding ? 1 : 0,
      }
    : frame;

  return (
    <div className={`ll-views ${playMode === 'race' ? 'split' : ''} ${stacked ? 'stacked' : ''}`}>
      <div className="ll-view">
        {playMode === 'race' && (
          <div className="ll-view-name">
            You · {name} · {progress(frame.x)}
          </div>
        )}
        <LeapViewport
          frame={frame}
          scale={scale}
          sprite={sprite}
          others={remotePlayers}
          effects={effects}
        />
      </div>
      {playMode === 'race' && (
        <div className="ll-view">
          <div className="ll-view-name">
            {rival ? `${rival.name} · ${progress(rival.x)}` : 'Waiting for racer'}
          </div>
          <LeapViewport
            frame={rivalFrame}
            scale={scale}
            sprite={rivalSprite}
            others={
              <LavaLeapPlayer
                x={frame.x}
                y={frame.y}
                sprite={sprite}
                rescued={frame.rescueGlow > 0}
                gliding={frame.glide > 0}
                name="You"
              />
            }
          />
        </div>
      )}
    </div>
  );
}
