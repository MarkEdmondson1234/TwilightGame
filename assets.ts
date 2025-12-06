// Centralized asset loader - Vite will bundle all imported assets
// This ensures assets work in production with the correct base path

// Tile assets - Use optimized versions for better performance
export const tileAssets = {
  grass_1: '/TwilightGame/assets-optimized/tiles/grass_1.png',
  grass_2: '/TwilightGame/assets-optimized/tiles/grass_2.png',
  rock_1: '/TwilightGame/assets-optimized/tiles/rock_1.png',
  rock_2: '/TwilightGame/assets-optimized/tiles/rock_2.png',
  door_1: '/TwilightGame/assets-optimized/tiles/door_1.png',
  mushrooms: '/TwilightGame/assets-optimized/tiles/mushrooms.png',
  bush_1: '/TwilightGame/assets-optimized/tiles/bush_1.png',
  tree_big_1: '/TwilightGame/assets-optimized/tiles/tree_big_1.png',
  tree_cherry_spring: '/TwilightGame/assets-optimized/tiles/tree_cherry_spring.png',
  tree_cherry_summer_fruit: '/TwilightGame/assets-optimized/tiles/tree_cherry_summer_fruit.png',
  tree_cherry_summer_no_fruit: '/TwilightGame/assets-optimized/tiles/tree_cherry_summer_no_fruit.png',
  tree_cherry_autumn: '/TwilightGame/assets-optimized/tiles/tree_cherry_autumn.png',
  tree_cherry_winter: '/TwilightGame/assets-optimized/tiles/tree_cherry_winter.png',
  bricks_1: '/TwilightGame/assets-optimized/tiles/bricks_1.png',
  path_horizontal: '/TwilightGame/assets-optimized/tiles/path_horizontal.png',
  path_curve_bottom_to_right: '/TwilightGame/assets-optimized/tiles/path_curve_bottom_to_right.png',
  path_curve_left_to_bottom: '/TwilightGame/assets-optimized/tiles/path_curve_left_to_bottom.png',
  path_curve_left_to_top: '/TwilightGame/assets-optimized/tiles/path_curve_left_to_top.png',
  path_curve_top_to_right: '/TwilightGame/assets-optimized/tiles/path_curve_top_to_right.png',
  path_end_left: '/TwilightGame/assets-optimized/tiles/path_end_left.png',
  path_end_right: '/TwilightGame/assets-optimized/tiles/path_end_right.png',
  stepping_stones_1: '/TwilightGame/assets-optimized/tiles/stepping_stones_1.png',
  stepping_stones_2: '/TwilightGame/assets-optimized/tiles/stepping_stones_2.png',
  stepping_stones_3: '/TwilightGame/assets-optimized/tiles/stepping_stones_3.png',
  stepping_stones_4: '/TwilightGame/assets-optimized/tiles/stepping_stones_4.png',
  cottage_wooden: '/TwilightGame/assets-optimized/tiles/cottage_wooden_512.png',
  cottage_stone: '/TwilightGame/assets-optimized/tiles/cottage_stone.png',
  cottage_w_flowers: '/TwilightGame/assets-optimized/tiles/cottage_w_flowers.png',
  shop_spring: '/TwilightGame/assets-optimized/tiles/shop/shop_spring.png',
  shop_summer: '/TwilightGame/assets-optimized/tiles/shop/shop_summer.png',
  shop_autumn: '/TwilightGame/assets-optimized/tiles/shop/shop_autumn.png',
  shop_winter: '/TwilightGame/assets-optimized/tiles/shop/shop_winter.png',
  garden_shed_spring: '/TwilightGame/assets-optimized/tiles/shed/garden_shed_spring.png',
  garden_shed_summer: '/TwilightGame/assets-optimized/tiles/shed/garden_shed_summer.png',
  garden_shed_autumn: '/TwilightGame/assets-optimized/tiles/shed/garden_shed_autumn.png',
  garden_shed_winter: '/TwilightGame/assets-optimized/tiles/shed/garden_shed_winter.png',
  floor_1: '/TwilightGame/assets-optimized/tiles/floor_1.png',
  floor_light: '/TwilightGame/assets-optimized/tiles/floor_light.png',
  floor_dark: '/TwilightGame/assets-optimized/tiles/floor_dark.png',
  wooden_wall_poor: '/TwilightGame/assets-optimized/tiles/wooden_wall_poor.png',
  wooden_wall: '/TwilightGame/assets-optimized/tiles/wooden_wall.png',
  wooden_wall_posh: '/TwilightGame/assets-optimized/tiles/wooden_wall_posh.png',
  rug_cottagecore: '/TwilightGame/assets-optimized/tiles/rug_cottagecore.png',
  cottage_bed: '/TwilightGame/assets-optimized/tiles/bed-cottage-square.png',
  sofa_01: '/TwilightGame/assets-optimized/tiles/sofa_01.png',
  sofa_02: '/TwilightGame/assets-optimized/tiles/sofa_02.png',
  sofa_table: '/TwilightGame/assets-optimized/tiles/sofa_table.png',
  chimney: '/TwilightGame/assets-optimized/tiles/chimney.png',
  stove: '/TwilightGame/assets-optimized/tiles/stove.png',
  mine_entrance: '/TwilightGame/assets-optimized/tiles/mine_entrance.png',
  mine_floor: '/TwilightGame/assets-optimized/tiles/mine_floor.png',
  // Lake tiles (directional edges for proper water rendering)
  water_center: '/TwilightGame/assets-optimized/tiles/lake/water_middle.png',
  water_left: '/TwilightGame/assets-optimized/tiles/lake/water_left.png',
  water_right: '/TwilightGame/assets-optimized/tiles/lake/lake_right.png',
  water_top: '/TwilightGame/assets-optimized/tiles/lake/lake_top.png',
  water_bottom: '/TwilightGame/assets-optimized/tiles/lake/lake_bottom.png',
  // Well assets (2x2 multi-tile sprite with seasonal variation)
  well: '/TwilightGame/assets-optimized/tiles/well.png',
  well_winter: '/TwilightGame/assets-optimized/tiles/well_in_winter.png',
  forest_fern1: '/TwilightGame/assets-optimized/tiles/forest_fern1.png',
  forest_fern2: '/TwilightGame/assets-optimized/tiles/forest_fern2.png',
  forest_fern3: '/TwilightGame/assets-optimized/tiles/forest_fern3.png',
  // Tuft grass assets (seasonal and style variations)
  tuft_01: '/TwilightGame/assets-optimized/tiles/tuft/tuft_01.png',
  tuft_02: '/TwilightGame/assets-optimized/tiles/tuft/tuft_02.png',
  tuft_spring: '/TwilightGame/assets-optimized/tiles/tuft/tuft_spring.png',
  tuft_autumn: '/TwilightGame/assets-optimized/tiles/tuft/tuft_autumn.png',
  tuft_winter: '/TwilightGame/assets-optimized/tiles/tuft/tuft_winter.png',
  // Hawthorn bush assets (seasonal variations)
  hawthorn_spring: '/TwilightGame/assets-optimized/tiles/hawthorn_bush/hawthorn_spring.png',
  hawthorn_summer: '/TwilightGame/assets-optimized/tiles/hawthorn_bush/hawthorn_summer.png',
  hawthorn_autumn: '/TwilightGame/assets-optimized/tiles/hawthorn_bush/hawthorn_autumn.png',
  hawthorn_winter: '/TwilightGame/assets-optimized/tiles/hawthorn_bush/hawthorn_winter.png',
  // Oak tree assets (seasonal variations)
  oak_tree_spring: '/TwilightGame/assets-optimized/tiles/oak_tree_spring.png',
  oak_tree_summer: '/TwilightGame/assets-optimized/tiles/oak_tree_summer.png',
  oak_tree_autumn: '/TwilightGame/assets-optimized/tiles/oak_tree_autumn.png',
  oak_tree_winter: '/TwilightGame/assets-optimized/tiles/oak_tree_winter.png',
  // Fairy oak assets (seasonal variations)
  fairy_oak_spring: '/TwilightGame/assets-optimized/tiles/fairy_oak_spring.png',
  fairy_oak_summer: '/TwilightGame/assets-optimized/tiles/fairy_oak_summer.png',
  fairy_oak_autumn: '/TwilightGame/assets-optimized/tiles/fairy_oak_autumn.png',
  fairy_oak_winter: '/TwilightGame/assets-optimized/tiles/fairy_oak_winter.png',
  // Spruce tree assets (evergreen with winter variation)
  spruce_tree: '/TwilightGame/assets-optimized/tiles/spruce_tree.png?v=3',
  spruce_tree_winter: '/TwilightGame/assets-optimized/tiles/spruce_tree_winter.png',
  // Willow tree assets (seasonal variations)
  willow_tree: '/TwilightGame/assets-optimized/tiles/willow/willow_tree.png',
  willow_tree_autumn: '/TwilightGame/assets-optimized/tiles/willow/willow_tree_autumn.png',
  willow_tree_winter: '/TwilightGame/assets-optimized/tiles/willow/willow_tree_winter.png',
  // Wild iris assets (seasonal variations - grows near water)
  // Optimized at 768x768 with HIGH_QUALITY (keyword: iris in optimize-assets.js)
  wild_iris_spring: '/TwilightGame/assets-optimized/tiles/wild_iris/iris_spring.png',
  wild_iris_summer: '/TwilightGame/assets-optimized/tiles/wild_iris/iris_summer.png',
  wild_iris_autumn: '/TwilightGame/assets-optimized/tiles/wild_iris/iris_autumn.png',
  wild_iris_winter: '/TwilightGame/assets-optimized/tiles/wild_iris/iris_winter.png',
  // Brambles assets (seasonal variations - thorny obstacles)
  brambles_spring: '/TwilightGame/assets-optimized/tiles/brambles/brambles_spring.png',
  brambles_summer: '/TwilightGame/assets-optimized/tiles/brambles/brambles_summer.png',
  brambles_autumn: '/TwilightGame/assets-optimized/tiles/brambles/brambles_autumn.png',
  brambles_winter: '/TwilightGame/assets-optimized/tiles/brambles/brambles_winter.png',
  // Witch hut asset
  witch_hut: '/TwilightGame/assets-optimized/witchhut/witch_hut.png',
};

// Farming assets - Use optimized versions for better performance
export const farmingAssets = {
  fallow_soil_1: '/TwilightGame/assets-optimized/farming/fallow_soil_1.png',
  fallow_soil_2: '/TwilightGame/assets-optimized/farming/fallow_soil_2.png',
  tilled: '/TwilightGame/assets-optimized/farming/tilled.png',
  seedling: '/TwilightGame/assets-optimized/farming/seedling.png',
  plant_pea_young: '/TwilightGame/assets-optimized/farming/plant_pea_young.png',
  plant_pea_adult: '/TwilightGame/assets-optimized/farming/plant_pea_adult.png',
  plant_strawberry_young: '/TwilightGame/assets-optimized/farming/plant_strawberry_young.png',
  plant_strawberry_adult: '/TwilightGame/assets-optimized/farming/plant_strawberry_adult.png',
  wilted_plant: '/TwilightGame/assets-optimized/farming/wilted_plant.png',
};

// Cooking assets - Food items and ingredients
export const cookingAssets = {
  cookies: '/TwilightGame/assets-optimized/cooking/cookies.png',
  cup_of_tea: '/TwilightGame/assets-optimized/cooking/cup_of_tea.png',
  french_toast: '/TwilightGame/assets-optimized/cooking/french_toast.png?v=2',
  milk: '/TwilightGame/assets-optimized/cooking/milk.png',
  roast_dinner: '/TwilightGame/assets-optimized/cooking/roast_dinner.png',
  tea: '/TwilightGame/assets-optimized/cooking/tea.png',
};

// NPC assets - Use optimized versions for in-game sprites, originals for portraits
export const npcAssets = {
  little_girl: '/TwilightGame/assets-optimized/npcs/little_girl.png',
  little_girl_portrait: '/TwilightGame/assets/npcs/little_girl.png',
  // Cat assets: Using originals (in subfolder, not auto-optimized by script)
  cat_sleeping_01: '/TwilightGame/assets/npcs/cat/cat_sleeping_01.png',
  cat_sleeping_02: '/TwilightGame/assets/npcs/cat/cat_sleeping_02.png',
  cat_sleeping_angry: '/TwilightGame/assets/npcs/cat/cat_sleeping_angry.png',
  cat_stand_01: '/TwilightGame/assets/npcs/cat/cat_stand_01.png',
  cat_stand_02: '/TwilightGame/assets/npcs/cat/cat_stand_02.png',
  cat_portrait: '/TwilightGame/assets/npcs/cat/cat_sleeping_01.png', // Original for dialogue
  elderly_01: '/TwilightGame/assets-optimized/npcs/elderly_01.png',
  elderly_02: '/TwilightGame/assets-optimized/npcs/elderly_02.png',
  elderly_portrait: '/TwilightGame/assets/npcs/elderly_01.png',
  old_woman_01: '/TwilightGame/assets-optimized/npcs/old_woman_knitting_01.png',
  old_woman_02: '/TwilightGame/assets-optimized/npcs/old_woman_knitting_02.png',
  old_woman_portrait: '/TwilightGame/assets/npcs/old_woman_knitting_02.png',
  shopkeeper_fox_01: '/TwilightGame/assets-optimized/npcs/shop_keeper_fox_01.png',
  shopkeeper_fox_02: '/TwilightGame/assets-optimized/npcs/shop_keeper_fox_02.png',
  shopkeeper_fox_portrait: '/TwilightGame/assets/npcs/shop_keeper_fox_01.png',
  dog_01: '/TwilightGame/assets-optimized/npcs/dog_01.png',
  dog_02: '/TwilightGame/assets-optimized/npcs/dog_02.png',
  dog_portrait: '/TwilightGame/assets/npcs/dog_01.png', // Original for dialogue
  mum_01: '/TwilightGame/assets-optimized/npcs/mum_01.png',
  mum_02: '/TwilightGame/assets-optimized/npcs/mum_02.png',
  mum_portrait: '/TwilightGame/assets/npcs/mum_01.png', // Original for dialogue
  // Umbra Wolf assets (forest creature)
  umbrawolf_standing1: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_standing1.png',
  umbrawolf_standing2: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_standing2.png',
  umbrawolf_sitting_01: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_sitting_01.png',
  umbrawolf_sitting_02: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_sitting_02.png',
  umbrawolf_front: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_front.png',
  umbrawolf_back: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_back.png',
  umbrawolf_portrait: '/TwilightGame/assets/npcs/umbra_wolf/umbrawolf_front.png', // Original for dialogue
  // Walking animation frames (facing right - flip for left)
  umbrawolf_walk1: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf1.png',
  umbrawolf_walk2: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf2.png',
  umbrawolf_walk3: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf3.png',
  umbrawolf_walk4: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf4.png',
  umbrawolf_walk5: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf5.png',
  umbrawolf_walk6: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf6.png',
  // Witch Wolf assets (rare forest creature with blinking animation)
  witch_wolf_01: '/TwilightGame/assets/npcs/witch/witch_wolf_01.png',
  witch_wolf_02: '/TwilightGame/assets/npcs/witch/witch_wolf_02.png',
  witch_wolf_portrait: '/TwilightGame/assets/npcs/witch/witch_wolf_01.png',
  // Chill Bear assets (peaceful forest creature drinking tea)
  chill_bear_01: '/TwilightGame/assets/npcs/bear/chill_bear_tea_01.png',
  chill_bear_02: '/TwilightGame/assets/npcs/bear/chill_bear_tea_02.png',
  chill_bear_portrait: '/TwilightGame/assets/npcs/bear/chill_bear_tea_01.png',
  // Stella assets (fairy of the deep forest)
  stella_01: '/TwilightGame/assets/npcs/stella/stella_01.png',
  stella_02: '/TwilightGame/assets/npcs/stella/stella_02.png',
  stella_portrait: '/TwilightGame/assets/npcs/stella/stella_01.png',
  // Morgan assets (fairy companion)
  morgan_01: '/TwilightGame/assets/npcs/morgan/morgan_01.png',
  morgan_02: '/TwilightGame/assets/npcs/morgan/morgan_02.png',
  morgan_portrait: '/TwilightGame/assets/npcs/morgan/morgan_01.png',
};

// Player assets (add your custom sprites here when ready)
export const playerAssets = {
  // Example: down_0: '/TwilightGame/assets/player/down_0.png',
};

// Animation assets - Animated GIFs for environmental effects
// Note: GIFs ARE optimized by the asset pipeline (resized to 512x512 with gifsicle)
export const animationAssets = {
  cherry_spring_petals: '/TwilightGame/assets-optimized/animations/cherry_spring_petals.gif',
  // Future animations:
  // rain: '/TwilightGame/assets-optimized/animations/rain.gif',
  // snow: '/TwilightGame/assets-optimized/animations/snow.gif',
  // fireflies: '/TwilightGame/assets-optimized/animations/fireflies.gif',
};

// Particle assets - PNG sprites for weather particle systems
export const particleAssets = {
  rain: '/TwilightGame/assets/particles/rain.png',
  snow: '/TwilightGame/assets/particles/snow.png',
  fog: '/TwilightGame/assets/particles/fog.png',
  mist: '/TwilightGame/assets/particles/mist.png',
};
