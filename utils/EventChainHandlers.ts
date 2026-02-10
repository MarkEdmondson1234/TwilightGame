/**
 * EventChainHandlers - Registry for TypeScript handlers called by event chains
 *
 * Handlers are registered by chainId:stageId and execute complex game logic
 * (inventory manipulation, harvest tracking, etc.) when stages are entered.
 * This keeps narrative structure in YAML while game logic stays in TypeScript.
 */

import type { EventChainManager } from './EventChainManager';

// ============================================
// Types
// ============================================

/** Context passed to stage handlers */
export interface HandlerContext {
  chainManager: EventChainManager;
}

/** Function called when a chain enters a specific stage */
export type StageHandler = (
  chainId: string,
  stageId: string,
  context: HandlerContext
) => void | Promise<void>;

// ============================================
// Handler Registry
// ============================================

class EventChainHandlerRegistry {
  private handlers = new Map<string, StageHandler>();

  /** Register a handler for a specific chain + stage combination */
  register(chainId: string, stageId: string, handler: StageHandler): void {
    const key = `${chainId}:${stageId}`;
    this.handlers.set(key, handler);
  }

  /** Execute the handler for a chain + stage if one is registered */
  async execute(chainId: string, stageId: string, context: HandlerContext): Promise<void> {
    const key = `${chainId}:${stageId}`;
    const handler = this.handlers.get(key);
    if (handler) {
      try {
        await handler(chainId, stageId, context);
      } catch (err) {
        console.warn(`[EventChainHandlers] Handler failed for ${key}:`, err);
      }
    }
  }

  /** Check if a handler exists for a chain + stage */
  hasHandler(chainId: string, stageId: string): boolean {
    return this.handlers.has(`${chainId}:${stageId}`);
  }
}

// ============================================
// Singleton Export
// ============================================

export const handlerRegistry = new EventChainHandlerRegistry();
