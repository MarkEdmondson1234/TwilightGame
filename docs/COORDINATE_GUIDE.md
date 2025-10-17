# Coordinate System Guide

## Important: Avoiding Off-By-One Errors

When placing transitions (doors, exits) in maps, the coordinate system can be confusing. Here's how to find the correct positions:

### How to Count Positions

Grid strings are 0-indexed. Each character position is:
```
Position:  0  1  2  3  4  5  6  7  8  9 10 11 12
Character: R  G  G  G  G  O  B  N  B  G  G  P  G
```

### Finding Tile Positions

1. **Use this bash command to see positions**:
   ```bash
   echo "YOUR_GRID_LINE" | awk '{for(i=1;i<=length($0);i++){c=substr($0,i,1); printf "%2d:%s ", i-1, c; if(i%10==0) printf "\n"}}'
   ```

2. **Example**: Finding a door (N) in this line:
   ```
   RGGGGGGPOBNBOGPGGGMGGGGGGGGR
   ```

   Run:
   ```bash
   echo "RGGGGGGPOBNBOGPGGGMGGGGGGGGR" | awk '{for(i=1;i<=length($0);i++){c=substr($0,i,1); printf "%2d:%s ", i-1, c; if(i%10==0) printf "\n"}}'
   ```

   Output:
   ```
   0:R  1:G  2:G  3:G  4:G  5:G  6:G  7:P  8:O  9:B
   10:N 11:B 12:O 13:G 14:P 15:G 16:G 17:G 18:M
   ```

   The N is at position **10** (not 9, not 11)

### Row Numbers

Rows are also 0-indexed. In your grid string:
- First line after opening backtick = row 0
- Second line = row 1
- etc.

**Example**:
```typescript
const gridString = `
RRRRRRRRRR  ← Row 0
RGGGGGGGGG  ← Row 1
RGGGOBNBGG  ← Row 2  (N is at x=7, y=2)
RRRRRRRRRR  ← Row 3
`;
```

### Quick Reference: Building Tiles

When creating buildings with multiple tiles:
```
OOOO  ← Roof tiles
OBVB  ← Wall (B), Window (V)
OBVB  ← Wall (B), Window (V)
OBNB  ← Wall (B), Door (N)
```

If this is at position x=5 starting point:
- First O is at x=5
- First B is at x=6
- V is at x=7
- Second B is at x=8
- N (door) in bottom row is at x=7

### Checklist When Adding Transitions

1. ✅ Count the exact x position of the tile (use bash command above)
2. ✅ Count the exact y position (row number, starting from 0)
3. ✅ Verify the tile type matches (BUILDING_DOOR for N, DOOR for D, etc.)
4. ✅ Test in-game - the yellow box should align with the tile
5. ✅ If misaligned, recount carefully and adjust

### Common Mistakes

- ❌ Counting from 1 instead of 0
- ❌ Forgetting the border tile (R) at position 0
- ❌ Miscounting multi-character patterns (like OBNB)
- ❌ Using old positions after editing the grid
