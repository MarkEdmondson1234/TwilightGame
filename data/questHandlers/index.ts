/**
 * Quest Handlers - Central registration for all quest handler files
 *
 * Importing this module registers all quest stage handlers with the
 * EventChainHandlerRegistry. Must be imported during game initialisation.
 */

// Import each handler to trigger its handlerRegistry.register() calls
import './altheaChoresHandler';
import './witchGardenHandler';
// gardeningQuestHandler has no stage handlers (logic is pull-based via dialogue)
// fairyBluebellsHandler has no stage handlers (item delivery is pull-based)
// fairyQueenHandler has no stage handlers (fairy meetings are pull-based)

// Re-export everything for convenience
export * from './altheaChoresHandler';
export * from './witchGardenHandler';
export * from './gardeningQuestHandler';
export * from './fairyBluebellsHandler';
export * from './fairyQueenHandler';
