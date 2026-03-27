/**
 * Quest Handlers - Central registration for all quest handler files
 *
 * Importing this module registers all quest stage handlers with the
 * EventChainHandlerRegistry. Must be imported during game initialisation.
 */

// Import each handler to trigger its handlerRegistry.register() calls
import './altheaChoresHandler';
import './witchGardenHandler';
import './daveadLavaCakeHandler';
import './mrFoxPicnicHandler';
// gardeningQuestHandler has no stage handlers (logic is pull-based via dialogue)
// fairyBluebellsHandler has no stage handlers (item delivery is pull-based)
// fairyQueenHandler has no stage handlers (fairy meetings are pull-based)
// estrangedSistersHandler has no stage handlers (all logic is pull-based)

// Re-export everything for convenience
export * from './altheaChoresHandler';
export * from './witchGardenHandler';
export * from './daveadLavaCakeHandler';
export {
  TOTAL_MESS_PILES,
  MAX_BASKET_MEALS,
  MESS_PILE_POSITIONS,
  isMrFoxPicnicActive,
  isMrFoxPicnicCompleted,
  getMrFoxPicnicStage,
  isMrFoxPicnicAtStage,
  startMrFoxPicnic,
  hasDeclinedPicnicOffer,
  markPicnicOfferDeclined,
  getMessCleaned,
  getMessRemaining,
  areAllMessCleaned,
  markMessCleaned,
  checkShedComplete,
  handleBlanketGiven,
  getBasketContents,
  isBasketFull,
  addMealToBasket,
  handleBasketGiven,
  handleQuestComplete,
  setProximityOfferPending,
  consumeProximityOfferPending,
  QUEST_ID as MR_FOX_PICNIC_QUEST_ID,
} from './mrFoxPicnicHandler';
export type { MessPilePosition } from './mrFoxPicnicHandler';
export * from './gardeningQuestHandler';
export * from './fairyBluebellsHandler';
export * from './fairyQueenHandler';
export {
  isEstrangedSistersActive,
  isEstrangedSistersCompleted,
  getEstrangedSistersStage,
  deliverLetterToJuniper,
  deliverPhotoToJuniper,
  completeEstrangedSistersQuest,
} from './estrangedSistersHandler';
