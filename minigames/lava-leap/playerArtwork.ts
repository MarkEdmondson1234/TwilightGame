/** Visible alpha bounds (>8), measured from the existing optimised artwork.
 * Keep transparent margins out of sizing and anchor the visible feet to ground.
 * tests/lavaLeapArtwork.test.ts checks these against every source frame.
 */
export const PLAYER_ART_BOUNDS: Record<string, [number, number, number, number, number]> = {
  'character1/left_0': [1024, 349, 122, 671, 719],
  'character1/left_1': [1024, 337, 194, 612, 750],
  'character1/left_2': [1024, 337, 210, 613, 750],
  'character1/left_3': [1024, 337, 205, 613, 750],
  'character1/right_0': [1024, 349, 122, 671, 719],
  'character1/right_1': [1024, 337, 194, 613, 750],
  'character1/right_2': [1024, 336, 210, 613, 750],
  'character1/right_3': [1024, 336, 205, 613, 750],
  'character2/left_0': [1000, 285, 125, 614, 770],
  'character2/left_1': [1000, 275, 82, 615, 770],
  'character2/left_2': [1000, 248, 125, 614, 769],
  'character2/left_3': [1000, 236, 82, 615, 770],
  'character2/right_0': [1000, 238, 125, 567, 770],
  'character2/right_1': [1000, 237, 82, 577, 770],
  'character2/right_2': [1000, 238, 125, 604, 769],
  'character2/right_3': [1000, 237, 82, 616, 770],
};

export function playerArtworkBounds(url: string) {
  const match = url.match(/(character\d+)\/base\/(left|right)_(\d+)\.png$/);
  return match ? PLAYER_ART_BOUNDS[`${match[1]}/${match[2]}_${match[3]}`] : undefined;
}
