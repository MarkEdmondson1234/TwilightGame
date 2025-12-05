# Known Issues

This document tracks known issues, bugs, and their solutions in the TwilightGame codebase.

## PixiJS Texture Loading Issues

### Spruce Tree PNG Decode Error (Fixed)

**Date Discovered**: 2025-12-05
**Severity**: High (prevents game from loading)
**Status**: Fixed

#### Symptoms

PixiJS v8 fails to load the spruce_tree.png texture with the following error:

```
[TextureManager] Failed to load batch: Error: [Loader.load] Failed to load
http://localhost:4003/TwilightGame/assets-optimized/tiles/spruce_tree.png
InvalidStateError: The source image could not be decoded.
```

This error blocks the entire texture batch from loading, preventing background tiles from rendering. NPCs may still render as they're loaded in a separate batch.

#### Root Cause

PixiJS v8 has compatibility issues with **8-bit colormap PNG** files. The spruce_tree.png file was stored in 8-bit colormap format, which PixiJS cannot decode reliably.

**File format issues**:
- **Problematic**: `PNG image data, 1024 x 1024, 8-bit colormap, non-interlaced`
- **Working**: `PNG image data, 1000 x 1000, 8-bit/color RGBA, non-interlaced`

#### Solution

Convert the PNG from 8-bit colormap to RGB/RGBA format using Sharp:

```bash
node -e "const sharp = require('sharp'); \
  sharp('public/assets/tiles/spruce_tree.png') \
  .png({palette:false, compressionLevel:9}) \
  .toFile('public/assets-optimized/tiles/spruce_tree.png') \
  .then(() => console.log('Fixed!')) \
  .catch(err => console.error('Error:', err))"
```

**Key parameters**:
- `palette: false` - Forces RGB/RGBA output instead of indexed color (colormap)
- `compressionLevel: 9` - Maximum compression for smaller file size

#### Cache Issues

After fixing the file, browser caching can prevent the new version from loading. Solutions:

1. **Hard refresh**: Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. **Cache-busting query parameter**: Add `?v=X` to the asset path in `assets.ts`
3. **Restart dev server**: Kill and restart the Vite dev server

Example cache-busting:
```typescript
spruce_tree: '/TwilightGame/assets-optimized/tiles/spruce_tree.png?v=3',
```

Increment the version number each time the file changes.

#### Prevention

Update the asset optimization script (`scripts/optimize-assets.js`) to force RGB output for all PNGs:

```javascript
await sharp(inputPath)
  .resize(targetSize, targetSize)
  .png({
    palette: false,        // ← Force RGB/RGBA, not colormap
    compressionLevel: 9,
    quality: 95
  })
  .toFile(outputPath);
```

This ensures all optimized PNGs are compatible with PixiJS v8.

#### Related Files

- `assets.ts:91` - Asset path with cache-busting parameter
- `scripts/optimize-assets.js` - Asset optimization pipeline
- `utils/TextureManager.ts:72-86` - Batch texture loading logic
- `public/assets/tiles/spruce_tree.png` - Source file
- `public/assets-optimized/tiles/spruce_tree.png` - Optimized file

#### PixiJS Version

This issue affects **PixiJS v8.14.0**. Earlier versions may have different compatibility requirements.

#### Testing

To verify the fix:

1. Check file format: `file public/assets-optimized/tiles/spruce_tree.png`
2. Should show: `8-bit/color RGBA` (not `8-bit colormap`)
3. Load game and check browser console for texture loading errors
4. Verify background tiles render correctly

---

## Git Case-Sensitivity Issues (Windows)

### Duplicate Files with Different Cases

**Date Discovered**: 2025-12-05
**Severity**: Medium (causes confusion, potential loading errors)
**Status**: Ongoing

#### Symptoms

Git tracks multiple versions of the same file with different cases:
- `Spruce_tree.PNG` (capital S, capital PNG)
- `spruce_tree.png` (lowercase)

On Windows (case-insensitive filesystem), these resolve to the same physical file, but Git treats them as separate files.

#### Root Cause

Windows filesystems are case-insensitive, but Git is case-sensitive. When a file is renamed with different casing, Git tracks both versions.

#### Impact

- Asset loading confusion (which file is being loaded?)
- Git merge conflicts
- Inconsistent file references

#### Solution

**For existing duplicates**:

1. Check Git's tracked files: `git ls-files | grep -i spruce`
2. Remove old casing: `git rm --cached "public/assets-optimized/tiles/Spruce_tree.PNG"`
3. Stage correct casing: `git add "public/assets-optimized/tiles/spruce_tree.png"`
4. Commit: `git commit -m "Fix file casing for spruce_tree.png"`

**Prevention**:

Use consistent lowercase naming for all assets:
- ✅ `spruce_tree.png`, `oak_tree.png`, `grass_1.png`
- ❌ `Spruce_tree.PNG`, `Oak_Tree.PNG`, `Grass_1.PNG`

---

## Browser Cache Persistence

### Static Assets Not Updating After Changes

**Date Discovered**: 2025-12-05
**Severity**: Low (development annoyance)
**Status**: Ongoing

#### Symptoms

After fixing an asset file, the browser continues to load the old corrupted version despite:
- Vite HMR (Hot Module Replacement) updates
- Dev server restarts
- File timestamp changes

#### Root Cause

Modern browsers aggressively cache static assets (images, fonts, etc.) to improve performance. The cache may persist across dev server restarts.

#### Solutions

**Immediate fix** (development):
1. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache: DevTools → Network tab → Disable cache checkbox
3. Use cache-busting query parameters

**Long-term fix** (production):
- Vite automatically adds content hashes to built assets
- Example: `spruce_tree.abc123.png`
- No manual cache-busting needed in production builds

**Cache-busting pattern** (development):
```typescript
// assets.ts
spruce_tree: '/TwilightGame/assets-optimized/tiles/spruce_tree.png?v=3',
```

Increment `v` parameter when the file changes.

---

## Notes

- Always run `npx tsc --noEmit` after making changes to verify TypeScript compilation
- Test asset changes in a fresh browser session or incognito window
- Keep this document updated when new issues are discovered
- Add date, severity, and status to each issue
