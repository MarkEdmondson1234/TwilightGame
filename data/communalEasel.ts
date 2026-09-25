/**
 * The communal easel's tile: where Draw and Craft Workshop open, and where the
 * player's room draws the easel prop. One definition so the artwork and the two
 * activities cannot drift apart.
 *
 * It stands upstairs in the player's room, beside Mushra's crafting table
 * (utils/tinyWreathLesson.ts), so painting and wreath-making share one craft
 * corner at home. It used to be in Mum's kitchen; the owner wanted the kitchen
 * kept for cooking. (5, 4) is floor against the back wall, right of the table at
 * (2, 4) and clear of the stairs (3, 7), the arrival spot (3, 6) and the default
 * bed (12, 5). `tests/easelMiniGames.test.ts` checks it against the walkmesh.
 */
export const COMMUNAL_EASEL = { mapId: 'home_upstairs', x: 5, y: 4 } as const;
