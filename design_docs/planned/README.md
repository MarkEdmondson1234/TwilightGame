# Planned Features - Design Documents

This directory contains design documents for planned features and architectural changes.

---

## Active Plans

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

## Related Files

```
design_docs/
├── planned/               # This directory
│   ├── README.md         # You are here
│   ├── PIXI_MIGRATION.md
│   └── PIXI_API_REFERENCE.md
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
