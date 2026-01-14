# App.tsx Architectural Refactoring Design Document

## Executive Summary

App.tsx at 2,701 lines is 5.4x over the 500-line guideline. Simple extraction (moving code to hooks) has proven insufficient because **App.tsx is the central coordination hub** for 13+ singleton managers, 18+ refs, and complex bidirectional data flows.

This document proposes architectural changes to enable proper separation of concerns.

---

## Current Architecture Analysis

### The Core Problem

App.tsx isn't just large—it's the **only place** where these systems connect:

```
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx (2,701 lines)                  │
│  - 38 useState hooks                                        │
│  - 18 useRef declarations                                   │
│  - 30+ useEffect hooks                                      │
│  - 900+ line game loop                                      │
└─────────────────────────────────────────────────────────────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │MapMgr  │ │NPCMgr  │ │FarmMgr │ │GameState│ ... 13 more
   └────────┘ └────────┘ └────────┘ └────────┘
```

### Why Simple Extraction Fails

| Extraction | Why It Doesn't Work |
|------------|---------------------|
| **usePixiSetup** | Needs 10+ refs, currentMapId, visibleRange, farmUpdateTrigger, cameraX/Y, currentWeather, seasonKey, plus callbacks for map loading |
| **useCanvasInteraction** | Needs activeNPC, isCutscenePlaying, 12 UI flags, currentMapId, selectedItemSlot, inventoryItems, 10+ action callbacks |
| **UIOverlays component** | Each modal needs different props: playerPos, currentMapId, inventoryItems, showToast, cookingPosition, etc. |

Moving code to hooks just relocates complexity—it doesn't reduce it.

---

## State Duplication Problem

The same data exists in multiple places, requiring manual synchronisation:

| Data | Locations | Sync Method |
|------|-----------|-------------|
| Player position | `playerPos` (state), `playerPosRef` (ref), `gameState.playerLocation` | useEffect + manual ref update |
| Stamina | `stamina` (state), `gameState.statusEffects.stamina`, `staminaManager` | Subscription |
| Current map | `currentMapId` (state), `mapManager.currentMapId`, `gameState.player.currentMapId` | Direct assignment |
| Weather | `currentWeather` (state), `gameState.weather` | Subscription |
| Inventory | `inventoryItems` (state), `inventoryManager.items` | Manual sync |

This duplication causes:
- Bug-prone synchronisation code
- Unclear source of truth
- Extra re-renders

---

## Architectural Options

### Option A: Event-Driven Architecture (Event Bus)

**Concept:** Managers communicate via events instead of direct calls. App.tsx becomes an event listener.

```typescript
// New: EventBus
class EventBus {
  emit(event: string, data: any): void
  on(event: string, handler: Function): () => void
}
export const eventBus = new EventBus();

// Manager emits events
class FarmManager {
  harvestCrop(position) {
    // ... update internal state
    eventBus.emit('farm:harvested', { position, crop, gold });
  }
}

// App.tsx listens
useEffect(() => {
  const unsub = eventBus.on('farm:harvested', (data) => {
    setFarmUpdateTrigger(prev => prev + 1);
  });
  return unsub;
}, []);
```

**Pros:**
- Decouples timing (events are async)
- Managers don't know about React
- Easy to add new listeners without modifying emitters
- Audit trail for debugging

**Cons:**
- Harder to trace data flow
- Event ordering can be tricky
- Need to define event schema
- Risk of event spam

**Effort:** Medium (2-3 days)
**Risk:** Medium
**Impact:** Medium (enables future refactoring)

---

### Option B: Domain Controllers

**Concept:** Group related hooks and state into domain-specific controllers.

```typescript
// MovementController owns all movement concerns
function useMovementController(config) {
  const [playerPos, setPlayerPos] = useState(...);
  const [direction, setDirection] = useState(...);
  const [animationFrame, setAnimationFrame] = useState(...);
  const playerPosRef = useRef(playerPos);

  // Internal hooks
  const collision = useCollisionDetection(...);
  const movement = usePlayerMovement(...);
  const clickToMove = useClickToMove(...);

  return {
    playerPos,
    direction,
    animationFrame,
    playerPosRef,
    movePlayer: movement.movePlayer,
    checkCollision: collision.checkCollision,
    setDestination: clickToMove.setDestination,
  };
}

// App.tsx uses controllers
const movement = useMovementController(config);
const interaction = useInteractionController(config);
const rendering = useRenderingController(config);
```

**Controllers:**
1. **MovementController** - position, direction, animation, collision, pathfinding
2. **InteractionController** - NPC dialogue, farming, cooking, transitions, radial menu
3. **RenderingController** - PixiJS layers, camera, viewport culling
4. **EnvironmentController** - weather, time, seasons, fairy spawning

**Pros:**
- Clear ownership of concerns
- Testable units
- Reduces App.tsx to ~400 lines
- Progressive migration possible

**Cons:**
- Controllers still need to communicate
- Shared state between controllers is tricky
- Significant refactoring effort

**Effort:** High (1-2 weeks)
**Risk:** Medium-High
**Impact:** High (solves the problem)

---

### Option C: React Context for Shared State

**Concept:** Move shared game state to React Context to eliminate prop drilling and state duplication.

```typescript
// GameContext provides unified state
const GameContext = createContext<GameContextValue>(null);

interface GameContextValue {
  player: {
    position: Position;
    direction: Direction;
    animationFrame: number;
    stamina: number;
  };
  map: {
    currentMapId: string;
    currentMap: MapDefinition;
  };
  weather: WeatherType;
  time: TimeState;
  // Actions
  movePlayer: (pos: Position) => void;
  transitionMap: (mapId: string, spawnPos: Position) => void;
}

// Provider wraps App
function GameProvider({ children }) {
  // Consolidate all state here
  const [player, setPlayer] = useState(...);
  const [map, setMap] = useState(...);

  return (
    <GameContext.Provider value={{ player, map, ... }}>
      {children}
    </GameContext.Provider>
  );
}

// Components use context
function NPCRenderer() {
  const { player, map } = useGameContext();
  // No props needed!
}
```

**Pros:**
- Eliminates state duplication
- No prop drilling
- Clear single source of truth
- React-native pattern

**Cons:**
- Large context causes excessive re-renders
- Need careful memoisation
- Doesn't solve manager coordination
- Migration is all-or-nothing

**Effort:** High (1-2 weeks)
**Risk:** High (performance concerns)
**Impact:** High (fundamental architecture change)

---

### Option D: PixiJS Renderer Abstraction (Targeted)

**Concept:** Wrap all PixiJS concerns in a single manager, removing 10+ refs from App.tsx.

```typescript
// New: PixiRenderer manages all layers
class PixiRenderer {
  private app: PIXI.Application;
  private layers: {
    tile: TileLayer;
    sprite: SpriteLayer;
    player: PlayerSprite;
    npc: NPCLayer;
    shadow: ShadowLayer;
    weather: WeatherLayer;
    darkness: DarknessLayer;
    placedItems: PlacedItemsLayer;
    backgroundImage: BackgroundImageLayer;
  };

  async initialize(canvas: HTMLCanvasElement): Promise<void>

  updateMap(mapId: string, map: MapDefinition, season: string): void
  updatePlayer(pos: Position, direction: Direction, frame: number): void
  updateNPCs(npcs: NPC[], characterScale: number): void
  updateCamera(x: number, y: number): void
  updateWeather(weather: WeatherType): void

  destroy(): void
}

// App.tsx becomes simple
const rendererRef = useRef<PixiRenderer>();

useEffect(() => {
  const renderer = new PixiRenderer();
  await renderer.initialize(canvasRef.current);
  rendererRef.current = renderer;
  return () => renderer.destroy();
}, []);

useEffect(() => {
  rendererRef.current?.updateMap(currentMapId, currentMap, seasonKey);
}, [currentMapId, seasonKey]);
```

**Pros:**
- Immediate impact (-300 lines from App.tsx)
- Low risk (encapsulates existing code)
- No changes to game logic
- Clear rendering boundary

**Cons:**
- Only addresses rendering, not state management
- Still need other refactoring
- PixiJS layer coordination is complex

**Effort:** Low-Medium (1-3 days)
**Risk:** Low
**Impact:** Medium (removes ref clutter)

---

### Option E: Full GameEngine Pattern

**Concept:** Create a GameEngine class that owns all managers and coordinates updates.

```typescript
class GameEngine {
  // Owns all managers
  private mapManager: MapManager;
  private npcManager: NPCManager;
  private farmManager: FarmManager;
  private inventoryManager: InventoryManager;
  // ... all 13+ managers

  // Lifecycle
  initialize(): Promise<void>
  update(deltaTime: number): void
  destroy(): void

  // State access (read-only to React)
  getState(): GameEngineState
  subscribe(listener: (state) => void): () => void

  // Actions (write)
  dispatch(action: GameAction): void
}

// App.tsx becomes thin
const [gameState, setGameState] = useState(null);

useEffect(() => {
  const engine = new GameEngine();
  engine.initialize().then(() => {
    engine.subscribe(setGameState);
  });
  return () => engine.destroy();
}, []);

// Game loop in engine, not App.tsx
useEffect(() => {
  const loop = () => {
    engine.update(deltaTime);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}, []);
```

**Pros:**
- Complete separation of concerns
- React becomes pure presentation
- Testable game logic
- Professional game architecture

**Cons:**
- Massive refactoring effort
- Need to migrate all manager usage
- Risk of breaking changes
- All-or-nothing migration

**Effort:** Very High (3-4 weeks)
**Risk:** High
**Impact:** Very High (complete solution)

---

## Risk/Cost-Benefit Analysis

| Option | Effort | Risk | Impact | Lines Removed | Recommended? |
|--------|--------|------|--------|---------------|--------------|
| **A: Event Bus** | Medium | Medium | Medium | ~100 | ✓ Foundation |
| **B: Domain Controllers** | High | Medium-High | High | ~800 | ✓ Best ROI |
| **C: React Context** | High | High | High | ~200 | ✗ Performance risk |
| **D: PixiJS Abstraction** | Low-Medium | Low | Medium | ~300 | ✓ Quick win |
| **E: Full GameEngine** | Very High | High | Very High | ~1,500 | ✗ Too risky |

---

## Recommended Approach: Phased Migration

### Phase 1: PixiJS Renderer Abstraction (1-3 days)
**Low risk, immediate benefit**

- Create `PixiRenderer` class wrapping all layer refs
- Move 10+ refs out of App.tsx
- Move PixiJS initialization/cleanup to renderer
- **Expected reduction:** ~300 lines

### Phase 2: Event Bus Foundation (2-3 days)
**Medium risk, enables future work**

- Add `EventBus` utility alongside existing code
- Managers emit events (non-breaking addition)
- App.tsx optionally listens to events
- **Expected reduction:** ~50 lines (but enables Phase 3)

### Phase 3: Domain Controllers (1-2 weeks)
**Medium-high risk, significant impact**

- Start with `MovementController` (most isolated)
- Progress to `InteractionController`
- Finally `RenderingController` (depends on Phase 1)
- **Expected reduction:** ~500 lines

### Phase 4: State Consolidation (1 week)
**Medium risk, final cleanup**

- Eliminate state duplication
- Single source of truth per domain
- Remove manual sync code
- **Expected reduction:** ~200 lines

**Total expected reduction:** ~1,050 lines
**Final App.tsx size:** ~650 lines (within guideline)

---

## Implementation Priority

```
NOW (Low Risk)
├── Phase 1: PixiJS Renderer Abstraction
│   └── Immediate line reduction, no architecture change
│
NEXT (Medium Risk)
├── Phase 2: Event Bus
│   └── Foundation for decoupling
│
LATER (Higher Risk)
├── Phase 3: Domain Controllers
│   ├── MovementController
│   ├── InteractionController
│   └── RenderingController
│
FINAL (Medium Risk)
└── Phase 4: State Consolidation
    └── Eliminate duplication
```

---

## Decision Needed

1. **Start with Phase 1 only?** - Safest, gets immediate results
2. **Commit to Phases 1-2?** - Builds foundation for future
3. **Full Phases 1-4?** - Complete solution but significant effort
4. **Skip to Phase 3?** - Bigger impact but higher risk

---

## Appendix: Files to Create/Modify

### Phase 1
- **Create:** `utils/pixi/PixiRenderer.ts`
- **Modify:** `App.tsx` (remove refs, use renderer)

### Phase 2
- **Create:** `utils/EventBus.ts`
- **Modify:** Managers (add event emissions)
- **Modify:** `App.tsx` (add event listeners)

### Phase 3
- **Create:** `hooks/useMovementController.ts`
- **Create:** `hooks/useInteractionController.ts`
- **Create:** `hooks/useRenderingController.ts`
- **Modify:** `App.tsx` (use controllers)

### Phase 4
- **Modify:** Various managers (use events for sync)
- **Delete:** Duplicate state in App.tsx
