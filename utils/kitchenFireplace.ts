/**
 * Where the kettle and fire are drawn in Mum's kitchen background art.
 *
 * The room is a background-image interior, so the fireplace is not a tile type
 * the map can be searched for — this anchor is the single place its position is
 * written down. The tea interaction and the tea-lesson indicator both read it,
 * so realigning the art only means moving it here.
 */
export const MUMS_KITCHEN_FIREPLACE = { x: 5, y: 4 } as const;
