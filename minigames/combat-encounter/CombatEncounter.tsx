/**
 * CombatEncounter — Cottagecore dialogue-style combat UI
 *
 * Renders like a conversation: NPC portrait on right, player on left,
 * narrative text in the middle, and three move buttons (Hearth/Wild/Shadow).
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import type { CombatMove } from './combatTypes';
import { getCombatantByNPCName, getCombatantByGameId } from './antagonists';
import { useCombatLogic, calculateRewards } from './useCombatLogic';
import { gameState } from '../../GameState';
import { getPortraitSprite } from '../../utils/portraitSprites';
import { Direction } from '../../types';
import { DEFAULT_CHARACTER } from '../../utils/characterSprites';
import { STAMINA } from '../../constants';
import { Z_DIALOGUE, zClass } from '../../zIndex';

// =============================================================================
// Move config (icons, colours, labels)
// =============================================================================

const MOVE_CONFIG: Record<
  CombatMove,
  { label: string; icon: string; colour: string; counter: string }
> = {
  strike: { label: 'Strike', icon: '\u2694\uFE0F', colour: '#c0392b', counter: 'dodge' },
  block: { label: 'Block', icon: '\u{1F6E1}\uFE0F', colour: '#2980b9', counter: 'strike' },
  dodge: { label: 'Dodge', icon: '\u{1F4A8}', colour: '#27ae60', counter: 'block' },
};

const SERIF_FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

// =============================================================================
// Sub-components
// =============================================================================

const StaminaBar: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const barColour = pct > 50 ? '#4ade80' : pct > 25 ? '#facc15' : '#ef4444';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: SERIF_FONT, fontSize: 13, color: '#d4c9a8' }}>Stamina</span>
      <div
        style={{
          flex: 1,
          height: 14,
          borderRadius: 7,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 7,
            background: barColour,
            transition: 'width 0.4s ease, background 0.4s ease',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: SERIF_FONT,
          fontSize: 13,
          color: '#d4c9a8',
          minWidth: 48,
          textAlign: 'right',
        }}
      >
        {Math.ceil(current)}/{max}
      </span>
    </div>
  );
};

const EnemyHits: React.FC<{ remaining: number; total: number }> = ({ remaining, total }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontFamily: SERIF_FONT, fontSize: 13, color: '#d4c9a8' }}>Enemy</span>
    {Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        style={{
          fontSize: 18,
          filter: i < remaining ? 'none' : 'grayscale(1) opacity(0.3)',
          transition: 'filter 0.3s ease',
        }}
      >
        {'\u2764\uFE0F'}
      </span>
    ))}
  </div>
);

const TimerBar: React.FC<{ progress: number; active: boolean }> = ({ progress, active }) => (
  <div
    style={{
      height: 6,
      borderRadius: 3,
      background: 'rgba(0,0,0,0.4)',
      overflow: 'hidden',
      opacity: active ? 1 : 0.3,
      transition: 'opacity 0.3s ease',
    }}
  >
    <div
      style={{
        width: `${progress * 100}%`,
        height: '100%',
        borderRadius: 3,
        background: progress > 0.5 ? '#4ade80' : progress > 0.25 ? '#facc15' : '#ef4444',
        transition: progress === 1 ? 'none' : 'width 0.05s linear',
      }}
    />
  </div>
);

// =============================================================================
// Item picker (simple inline list)
// =============================================================================

const USABLE_ITEMS = [
  { id: 'healing_salve', label: 'Healing Salve' },
  { id: 'wakefulness_brew', label: 'Wakefulness Brew' },
  { id: 'food_tea', label: 'Tea' },
  { id: 'food_bread', label: 'Bread' },
  { id: 'food_cookies', label: 'Cookies' },
  { id: 'food_french_toast', label: 'French Toast' },
  { id: 'food_crepes', label: 'Crepes' },
  { id: 'food_spaghetti', label: 'Spaghetti' },
  { id: 'food_pizza', label: 'Pizza' },
  { id: 'food_roast_dinner', label: 'Roast Dinner' },
  { id: 'food_chocolate_cake', label: 'Chocolate Cake' },
  { id: 'food_ice_cream', label: 'Ice Cream' },
];

const ItemPicker: React.FC<{
  actions: MiniGameComponentProps['context']['actions'];
  onUse: (itemId: string) => void;
  onClose: () => void;
}> = ({ actions, onUse, onClose }) => {
  const available = USABLE_ITEMS.filter((item) => actions.hasItem(item.id));

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 8,
        background: 'rgba(30, 25, 20, 0.95)',
        border: '2px solid rgba(200, 180, 140, 0.4)',
        borderRadius: 12,
        padding: 12,
        maxHeight: 200,
        overflowY: 'auto',
      }}
    >
      <div style={{ fontFamily: SERIF_FONT, fontSize: 14, color: '#d4c9a8', marginBottom: 8 }}>
        Use an item:
      </div>
      {available.length === 0 ? (
        <div style={{ fontFamily: SERIF_FONT, fontSize: 13, color: '#888', fontStyle: 'italic' }}>
          No usable items in your inventory
        </div>
      ) : (
        available.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onUse(item.id);
              onClose();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 10px',
              marginBottom: 4,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(200,180,140,0.2)',
              borderRadius: 6,
              color: '#d4c9a8',
              fontFamily: SERIF_FONT,
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {item.label} (x{actions.getItemQuantity(item.id)})
          </button>
        ))
      )}
      <button
        onClick={onClose}
        style={{
          marginTop: 6,
          padding: '4px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(200,180,140,0.2)',
          borderRadius: 6,
          color: '#888',
          fontFamily: SERIF_FONT,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const CombatEncounter: React.FC<MiniGameComponentProps> = ({ context, onClose, onComplete }) => {
  const gameId = (context.triggerData.extra?.gameId as string) ?? '';
  const npcName = (context.triggerData.extra?.npcName as string) ?? '';
  const npcSprite = (context.triggerData.extra?.npcSprite as string) ?? '';
  const config = getCombatantByNPCName(npcName) ?? getCombatantByGameId(gameId);

  if (!config) {
    return (
      <div
        className={`fixed inset-0 ${zClass(Z_DIALOGUE)}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)',
          color: '#d4c9a8',
          fontFamily: SERIF_FONT,
        }}
      >
        <div>
          <p>Unknown combatant: {npcName || gameId || '(none)'}</p>
          <button
            onClick={onClose}
            style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  // Use config name/sprite when not available from triggerData (e.g. DevTools launch)
  const displayName = npcName || config.npcName;
  const displaySprite = npcSprite || config.portraitSprite;

  return (
    <CombatEncounterInner
      config={config}
      npcName={displayName}
      npcSprite={displaySprite}
      context={context}
      onClose={onClose}
      onComplete={onComplete}
    />
  );
};

/** Inner component — only rendered when config is valid, so hooks are safe */
const CombatEncounterInner: React.FC<
  MiniGameComponentProps & {
    config: NonNullable<ReturnType<typeof getCombatantByNPCName>>;
    npcName: string;
    npcSprite: string;
  }
> = ({ config, npcName, npcSprite, context, onComplete }) => {
  const combat = useCombatLogic(config, context.actions);
  const { state } = combat;

  const playerSprite = useMemo(
    () =>
      getPortraitSprite(
        gameState.getSelectedCharacter() || DEFAULT_CHARACTER,
        Direction.Down,
        gameState.isFairyForm()
      ),
    []
  );

  const currentEnemySprite = useMemo(() => {
    const { phase, telegraphedMove, actualMove } = state;
    if (phase === 'telegraph' && telegraphedMove) {
      return config.actionSprites?.[telegraphedMove] ?? npcSprite;
    }
    if ((phase === 'reveal' || phase === 'result') && actualMove) {
      return config.actionSprites?.[actualMove] ?? npcSprite;
    }
    return npcSprite;
  }, [state.phase, state.telegraphedMove, state.actualMove, config, npcSprite]);

  const [showItemPicker, setShowItemPicker] = useState(false);
  const [stamina, setStamina] = useState(context.actions.getStamina());
  const [introReady, setIntroReady] = useState(false);
  const [fadeToBlack, setFadeToBlack] = useState(false);

  // Show intro text on mount, wait for player to click Ready
  useEffect(() => {
    combat.showIntro();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReady = useCallback(() => {
    setIntroReady(true);
    combat.start();
  }, [combat]);

  // Track stamina changes
  useEffect(() => {
    const interval = setInterval(() => {
      setStamina(context.actions.getStamina());
    }, 100);
    return () => clearInterval(interval);
  }, [context.actions]);

  // Handle combat end
  useEffect(() => {
    if (state.phase === 'victory') {
      const rewards = calculateRewards(config);
      const timer = setTimeout(() => {
        const result: MiniGameResult = {
          success: true,
          score: state.round,
          goldReward: rewards.gold,
          rewards: rewards.items,
          message: `Victory! Gained ${rewards.gold} gold${rewards.items.length > 0 ? ' and items' : ''}.`,
          messageType: 'success',
          progressData: {
            lastWin: Date.now(),
            totalWins: (context.storage.load<Record<string, number>>()?.totalWins ?? 0) + 1,
          },
        };
        onComplete(result);
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (state.phase === 'defeat') {
      // Show defeat text briefly, then fade to black, then transition
      const fadeTimer = setTimeout(() => {
        setFadeToBlack(true);
      }, 1500);
      const transitionTimer = setTimeout(() => {
        // Trigger exhaustion (teleport to Mum's kitchen, restore stamina)
        context.actions.triggerExhaustion();
        onComplete({
          success: false,
          progressData: {
            lastDefeat: Date.now(),
            totalDefeats: (context.storage.load<Record<string, number>>()?.totalDefeats ?? 0) + 1,
          },
        });
      }, 3500); // 1.5s text + 2s fade
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(transitionTimer);
      };
    }

    if (state.phase === 'fled') {
      const timer = setTimeout(() => {
        onComplete({
          success: false,
          message: 'You escaped safely.',
          messageType: 'info',
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseItem = useCallback(
    (itemId: string) => {
      combat.useItem(itemId);
      setStamina(context.actions.getStamina());
    },
    [combat, context.actions]
  );

  const isIntro = state.phase === 'intro';
  const isActionPhase = state.phase === 'telegraph';
  const isCombatActive = !['victory', 'defeat', 'fled', 'intro'].includes(state.phase);

  // Determine outcome indicator
  const outcomeIcon =
    state.roundOutcome === 'win'
      ? '\u2728'
      : state.roundOutcome === 'lose'
        ? '\u{1F4A5}'
        : state.roundOutcome === 'draw'
          ? '\u{1F300}'
          : null;

  return (
    <div
      className={`fixed inset-0 ${zClass(Z_DIALOGUE)} overflow-hidden`}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Background — captures clicks so nothing reaches the game beneath */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(30, 30, 50, 0.85) 0%, rgba(20, 20, 35, 0.95) 100%)',
        }}
      />

      {/* Fade to black overlay (defeat) */}
      <div
        className="absolute inset-0"
        style={{
          background: 'black',
          opacity: fadeToBlack ? 1 : 0,
          transition: 'opacity 2s ease-in',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />

      {/* Character portraits */}
      <div className="absolute inset-0 flex items-end justify-between pointer-events-none">
        {/* Player (left) */}
        <div
          className="relative flex-shrink-0"
          style={{ width: '35%', height: '80%', marginBottom: '10%' }}
        >
          <img
            src={playerSprite}
            alt="You"
            className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom"
            style={{
              imageRendering: 'auto',
              filter: 'drop-shadow(0 0 30px rgba(100, 200, 255, 0.3))',
              transform: 'scaleX(-1)',
              opacity: state.phase === 'defeat' ? 0.4 : 1,
              transition: 'opacity 0.5s ease',
            }}
          />
        </div>

        {/* Enemy (right) */}
        <div
          className="relative flex-shrink-0"
          style={{ width: '35%', height: '80%', marginBottom: '10%' }}
        >
          {currentEnemySprite && (
            <img
              src={currentEnemySprite}
              alt={npcName}
              className="absolute bottom-0 right-0 w-full h-full object-contain object-bottom"
              style={{
                imageRendering: 'auto',
                filter: `drop-shadow(0 0 30px rgba(255, 80, 80, 0.3))`,
                opacity: state.phase === 'victory' ? 0.4 : 1,
                transition: 'opacity 0.5s ease',
              }}
            />
          )}
        </div>
      </div>

      {/* Combat UI panel */}
      <div
        className="absolute left-1/2 bottom-0"
        style={{
          transform: 'translateX(-50%)',
          width: 'min(600px, 92vw)',
          padding: '16px 20px 24px',
        }}
      >
        {/* Name plate */}
        <div
          style={{
            fontFamily: SERIF_FONT,
            fontSize: 16,
            fontWeight: 600,
            color: '#f0e6cc',
            marginBottom: 8,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {npcName}
          {state.round > 0 && (
            <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>Round {state.round}</span>
          )}
        </div>

        {/* Narrative text box */}
        <div
          style={{
            background: 'rgba(30, 25, 20, 0.9)',
            border: '2px solid rgba(200, 180, 140, 0.3)',
            borderRadius: 12,
            padding: '14px 18px',
            minHeight: 60,
            marginBottom: 10,
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Telegraph move symbol — shows during telegraph; fades/crosses out on feint reveal */}
            {state.telegraphedMove && ['telegraph', 'reveal', 'result'].includes(state.phase) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 32,
                    opacity: state.phase === 'telegraph' ? 1 : state.isFeint ? 0.25 : 0.5,
                    transition: 'opacity 0.3s ease',
                    filter:
                      state.phase === 'telegraph'
                        ? `drop-shadow(0 0 8px ${MOVE_CONFIG[state.telegraphedMove].colour}66)`
                        : 'none',
                    textDecoration:
                      state.isFeint && state.phase !== 'telegraph' ? 'line-through' : 'none',
                  }}
                  title={`Telegraphing: ${MOVE_CONFIG[state.telegraphedMove].label}`}
                >
                  {MOVE_CONFIG[state.telegraphedMove].icon}
                </span>
                {/* Show actual move icon after feint is revealed */}
                {state.isFeint && state.actualMove && state.phase !== 'telegraph' && (
                  <>
                    <span style={{ fontSize: 16, color: '#d4a0a0' }}>{'\u2192'}</span>
                    <span
                      style={{
                        fontSize: 32,
                        filter: `drop-shadow(0 0 8px ${MOVE_CONFIG[state.actualMove].colour}88)`,
                      }}
                    >
                      {MOVE_CONFIG[state.actualMove].icon}
                    </span>
                  </>
                )}
              </div>
            )}
            <p
              style={{
                fontFamily: SERIF_FONT,
                fontSize: 15,
                lineHeight: 1.5,
                color: '#d4c9a8',
                margin: 0,
                flex: 1,
              }}
            >
              {state.narrativeText}
            </p>
          </div>
          {outcomeIcon && state.phase === 'result' && (
            <span
              style={{
                position: 'absolute',
                top: -10,
                right: 12,
                fontSize: 24,
                animation: 'bounce 0.5s ease',
              }}
            >
              {outcomeIcon}
            </span>
          )}
        </div>

        {/* Timer bar (hidden during intro) */}
        {!isIntro && (
          <TimerBar progress={state.timerProgress} active={state.phase === 'telegraph'} />
        )}

        {/* Intro: Ready button */}
        {isIntro && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={handleReady}
              style={{
                padding: '14px 40px',
                borderRadius: 10,
                border: '2px solid rgba(200, 180, 140, 0.4)',
                background: 'rgba(255,255,255,0.1)',
                color: '#f0e6cc',
                fontFamily: SERIF_FONT,
                fontSize: 17,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                letterSpacing: 1,
              }}
            >
              Stand your ground
            </button>
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => combat.flee()}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: '1px solid rgba(200, 100, 100, 0.3)',
                  background: 'rgba(255,80,80,0.08)',
                  color: '#d4a0a0',
                  fontFamily: SERIF_FONT,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {'\u{1F3C3}'} Flee ({config.fleeCost} stamina)
              </button>
            </div>
          </div>
        )}

        {/* Move buttons (hidden during intro) */}
        {!isIntro && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 10,
              justifyContent: 'center',
            }}
          >
            {(['strike', 'block', 'dodge'] as CombatMove[]).map((move) => {
              const cfg = MOVE_CONFIG[move];
              const isPlayerMove = state.playerMove === move;
              const isEnemyMove =
                state.actualMove === move && ['reveal', 'result'].includes(state.phase);

              return (
                <button
                  key={move}
                  onClick={() => combat.chooseMove(move)}
                  disabled={!isActionPhase}
                  style={{
                    flex: 1,
                    padding: '14px 8px',
                    borderRadius: 10,
                    border: isPlayerMove
                      ? `2px solid ${cfg.colour}`
                      : '2px solid rgba(200, 180, 140, 0.2)',
                    background: isPlayerMove
                      ? `${cfg.colour}33`
                      : isActionPhase
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.03)',
                    color: isActionPhase ? '#f0e6cc' : '#666',
                    fontFamily: SERIF_FONT,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: isActionPhase ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    position: 'relative',
                    opacity: isActionPhase ? 1 : 0.5,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                  {isEnemyMove && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        fontSize: 14,
                        background: 'rgba(255,60,60,0.9)',
                        borderRadius: '50%',
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {'\u2694\uFE0F'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Status row: stamina + enemy hits */}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <StaminaBar current={stamina} max={STAMINA.MAX} />
          <EnemyHits remaining={state.enemyHitsRemaining} total={config.hitsToDefeat} />
        </div>

        {/* Action row: use item + flee */}
        {isCombatActive && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 10,
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {showItemPicker && (
              <ItemPicker
                actions={context.actions}
                onUse={handleUseItem}
                onClose={() => setShowItemPicker(false)}
              />
            )}
            <button
              onClick={() => setShowItemPicker(!showItemPicker)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(200, 180, 140, 0.2)',
                background: 'rgba(255,255,255,0.06)',
                color: '#d4c9a8',
                fontFamily: SERIF_FONT,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {'\u{1F392}'} Use Item
            </button>
            <button
              onClick={() => combat.flee()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(200, 100, 100, 0.3)',
                background: 'rgba(255,80,80,0.08)',
                color: '#d4a0a0',
                fontFamily: SERIF_FONT,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {'\u{1F3C3}'} Flee
            </button>
          </div>
        )}

        {/* End-state close button */}
        {['victory', 'defeat', 'fled'].includes(state.phase) && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <span
              style={{
                fontFamily: SERIF_FONT,
                fontSize: 13,
                color: '#888',
                fontStyle: 'italic',
              }}
            >
              {state.phase === 'victory'
                ? 'Collecting your spoils...'
                : state.phase === 'defeat'
                  ? 'Fading to black...'
                  : 'Making your escape...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CombatEncounter;
