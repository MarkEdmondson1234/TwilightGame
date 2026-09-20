import type { MiniGameDefinition, MiniGameComponentProps } from '../types';
import { SlidingCratePuzzleGame } from '../sliding-crate-puzzle/SlidingCratePuzzleGame';
import { gameState } from '../../GameState';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { rememberActivityLead } from '../../utils/activityLeadStorage';

export function completeCrateTrail(): void {
  rememberActivityLead('crate-trail');
  if (gameState.isQuestCompleted('village_crate_trail')) return;
  gameState.startQuest('village_crate_trail');
  gameState.completeQuest('village_crate_trail');
  eventBus.emit(GameEvent.PLAYER_MILESTONE, { milestoneId: 'crate-trail' });
}

export function CrateTrailGame(props: MiniGameComponentProps) {
  return (
    <SlidingCratePuzzleGame
      {...props}
      practice
      onComplete={(result) => {
        if (result.success) completeCrateTrail();
        props.onComplete(result);
      }}
    />
  );
}

/** Separate identity and completion path: no Wizard Trials cutscene or unlock. */
export const crateTrailDefinition: MiniGameDefinition = {
  id: 'crate-trail',
  displayName: 'Play Crate Trail',
  description:
    'Help the village child clear a tiny delivery path. Undo and try again whenever you like.',
  icon: '📦',
  colour: '#a16207',
  component: CrateTrailGame,
  triggers: { npcId: 'child' },
  customBackdrop: true,
};
