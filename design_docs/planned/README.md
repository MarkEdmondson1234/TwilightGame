# Planned Features - Design Documents

This directory contains design documents for planned features and architectural changes.

---

## Active Plans

### 🧑‍🤝‍🧑 Multiplayer — Shared World

**Status**: Implemented (Phases 0-4). Inert until `VITE_FIREBASE_DATABASE_URL` is set.
**Remaining**: Phase 5 - phrase book, shared decorations, mailbox gifting

**Documents**:
- [MULTIPLAYER.md](./MULTIPLAYER.md) - Shared-world multiplayer: presence, state tiering, determinism, safety

**Why This Matters**:
- Players see each other move around Clover Village, with emotes and name tags
- Firestore for durable shared state, Realtime Database for ephemeral presence
- Also fixes the shared farm's double-harvest race, and makes procedural forests
  reproducible per day instead of regenerating on every entry

---

### 🎮 PixiJS Migration (High Priority)

**Status**: Ready to implement
**Estimated Effort**: 2-3 weeks
**Performance Impact**: 10-100x faster rendering

**Documents**:
- [PIXI_MIGRATION.md](./PIXI_MIGRATION.md) - Complete migration strategy and implementation plan
- [PIXI_API_REFERENCE.md](./PIXI_API_REFERENCE.md) - PixiJS v8 API reference and correct usage patterns

**Why This Matters**:
- Current DOM rendering: ~30-45 FPS with 900 tiles
- Target PixiJS rendering: 60 FPS with 10,000+ sprites
- Unlocks particle effects, lighting, larger maps
- Better mobile performance

**Prerequisites**:
- ✅ PixiJS 8.14.0 installed
- ✅ @pixi/react 8.0.3 installed
- ✅ Import tests passing
- ⏳ Design documents complete
- ⏳ Proof-of-concept needed

**Next Steps**:
1. Create `utils/TextureManager.ts` using Assets API
2. Create `utils/PixiRenderer.ts` with TileLayer class
3. Build proof-of-concept: render single map with PixiJS
4. Performance benchmark vs DOM renderer
5. Add feature flag for gradual rollout

---

## How to Use These Documents

### For Implementers
1. Read the migration document thoroughly
2. Check the API reference for v8-specific patterns
3. Follow the step-by-step implementation plan
4. Test each phase before moving to next
5. Update the document with learnings

### For Reviewers
- Ensure code matches patterns in API reference
- Verify performance benchmarks meet targets
- Check rollback plan is tested
- Validate feature flag works correctly

### For Future Reference
- Documents archived to `../implemented/` when complete
- Original design preserved for historical context
- Implementation notes added as appendix

---

## Document Status Guide

- **Draft**: Work in progress, not ready for implementation
- **Planned**: Complete, ready to implement
- **In Progress**: Currently being implemented
- **Blocked**: Waiting on dependencies or decisions
- **Implemented**: Moved to `../implemented/` directory

---

## Game Design Documents

Story, quests, and gameplay systems designed by Sanne.

### Game Systems

| File | Description | Status |
|------|-------------|--------|
| [system_farming.md](./system_farming.md) | Kitchen garden, crops, seasons, selling produce | Partial |
| [system_cooking.md](./system_cooking.md) | Cooking recipes, specialisations, food for friendship | Planned |
| [system_background_interiors.md](./system_background_interiors.md) | Background image rooms with walkmesh, parallax, windows | Planned |

**Implemented**: [system_friendship.md](../implemented/system_friendship.md) - Befriending villagers, friendship levels

### Events

| File | Description | Status |
|------|-------------|--------|
| [events_cyclic.md](./events_cyclic.md) | Seasonal events, travelling salesman, book club | Planned |
| [events_random.md](./events_random.md) | Weather, illness, plant pests, runaway dog | Planned |

### Quests

| File | Description | Trigger |
|------|-------------|---------|
| [quest_ghost_boy.md](./quest_ghost_boy.md) | The ghost boy trapped by the warlock | Year 1, Spring, Day 5 |
| [quest_bear.md](./quest_bear.md) | The bear and the rotten truffles | Year 1, Autumn |
| [quest_fairy_queen.md](./quest_fairy_queen.md) | Fairies, becoming small, visiting the fairy realm | Old Man's task |
| [quest_witch_apprentice.md](./quest_witch_apprentice.md) | Learning magic from the Witch in the Woods | After Fairy Queen |

### Quest Dependencies

```
Old Man's Task (3 plants)
    │
    ▼
Fairy Bluebells → Morgan the Fairy → Fairy Dust
    │
    ▼
Visit Fairy Queen (needs wings + shrinking)
    │
    ▼
Old Woman reveals Witch location
    │
    ▼
Become Witch's Apprentice → Full Witch
    │
    ▼
Witch's Brew (rescue the Witch)
```

**Original combined document**: [game_design_story_sanne.md](./game_design_story_sanne.md)

---

## Related Files

```
design_docs/
├── planned/               # This directory
│   ├── README.md         # You are here
│   ├── PIXI_MIGRATION.md
│   ├── PIXI_API_REFERENCE.md
│   ├── game_design_story_sanne.md  # Original design doc
│   ├── system_*.md       # Game systems
│   ├── events_*.md       # Event systems
│   └── quest_*.md        # Quest storylines
├── implemented/          # Completed features
└── archived/             # Rejected or superseded plans
```

---

## Version History

**v1.0** (Nov 1, 2025)
- Created PixiJS migration plan
- Created PixiJS v8 API reference
- Installed pixi.js and @pixi/react
- Verified imports working correctly

---

**Questions?** Check the design docs or ask in team chat.
