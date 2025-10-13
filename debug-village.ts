// Debug script to find exact positions of tiles in village
import { village } from './maps/definitions/village';

console.log('Village dimensions:', village.width, 'x', village.height);
console.log('\nSearching for special tiles:');

for (let y = 0; y < village.grid.length; y++) {
  for (let x = 0; x < village.grid[y].length; x++) {
    const tile = village.grid[y][x];
    // TileType enum: GRASS=0, ROCK=1, WATER=2, PATH=3, FLOOR=4, WALL=5, CARPET=6, DOOR=7, EXIT_DOOR=8, SHOP_DOOR=9, MINE_ENTRANCE=10
    if (tile === 7) { // DOOR
      console.log(`DOOR (D) found at (${x}, ${y})`);
    }
    if (tile === 9) { // SHOP_DOOR
      console.log(`SHOP_DOOR (S) found at (${x}, ${y})`);
    }
    if (tile === 10) { // MINE_ENTRANCE
      console.log(`MINE_ENTRANCE (M) found at (${x}, ${y})`);
    }
  }
}

console.log('\nCurrent transitions:');
village.transitions.forEach(t => {
  console.log(`  ${t.label}: (${t.fromPosition.x}, ${t.fromPosition.y})`);
});
