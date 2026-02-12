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
  stump: '/TwilightGame/assets-optimized/tiles/stump.png',
  tree_cherry_spring: '/TwilightGame/assets-optimized/tiles/tree_cherry_spring.png',
  tree_cherry_summer_fruit: '/TwilightGame/assets-optimized/tiles/tree_cherry_summer_fruit.png',
  tree_cherry_summer_no_fruit:
    '/TwilightGame/assets-optimized/tiles/tree_cherry_summer_no_fruit.png',
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
  cottage_wooden: '/TwilightGame/assets-optimized/tiles/cottage_small_spring.png',
  cottage_small_summer: '/TwilightGame/assets-optimized/tiles/cottage_small_summer.png',
  cottage_small_autumn: '/TwilightGame/assets-optimized/tiles/cottage_small_autumn.png',
  cottage_small_winter: '/TwilightGame/assets-optimized/tiles/cottage_small_winter.png',
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
  forest_fern3: '/TwilightGame/assets-optimized/tiles/forest_fern3.png',
  // Tuft grass assets (seasonal and style variations)
  tuft_01: '/TwilightGame/assets-optimized/tiles/tuft/tuft_01.png',
  tuft_02: '/TwilightGame/assets-optimized/tiles/tuft/tuft_02.png',
  tuft_sparse: '/TwilightGame/assets-optimized/tiles/tuft/tuft_sparse.png',
  tuft_spring: '/TwilightGame/assets-optimized/tiles/tuft/tuft_spring.png',
  tuft_autumn: '/TwilightGame/assets-optimized/tiles/tuft/tuft_autumn.png',
  tuft_winter: '/TwilightGame/assets-optimized/tiles/tuft/tuft_winter.png',
  village_green: '/TwilightGame/assets-optimized/tiles/village_green.png',
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
  // Birch tree assets (seasonal variations)
  birch_spring: '/TwilightGame/assets-optimized/tiles/birch_spring.png',
  birch_summer: '/TwilightGame/assets-optimized/tiles/birch_summer.png',
  birch_autumn: '/TwilightGame/assets-optimized/tiles/birch_autumn.png',
  birch_winter: '/TwilightGame/assets-optimized/tiles/birch_winter.png',
  // Spruce tree assets (evergreen with winter variation)
  spruce_tree: '/TwilightGame/assets-optimized/tiles/spruce_tree.png',
  spruce_tree_winter: '/TwilightGame/assets-optimized/tiles/spruce_tree_winter.png',
  // Willow tree assets (seasonal variations)
  willow_tree: '/TwilightGame/assets-optimized/tiles/willow/willow_tree.png',
  willow_tree_autumn: '/TwilightGame/assets-optimized/tiles/willow/willow_tree_autumn.png',
  willow_tree_winter: '/TwilightGame/assets-optimized/tiles/willow/willow_tree_winter.png',
  // Lilac tree assets (seasonal variations - flowering shrub/small tree)
  // Optimized at 768x768 with SHOWCASE_QUALITY (keyword: lilac in optimize-assets.js)
  lilac_tree_spring: '/TwilightGame/assets-optimized/tiles/village/lilac_spring.png',
  lilac_tree_summer: '/TwilightGame/assets-optimized/tiles/village/lilac_summer.png',
  lilac_tree_autumn: '/TwilightGame/assets-optimized/tiles/village/lilac_autumn.png',
  lilac_tree_winter: '/TwilightGame/assets-optimized/tiles/village/lilac_winter.png',
  // Wild iris assets (seasonal variations - grows near water)
  // Optimized at 768x768 with SHOWCASE_QUALITY (keyword: iris in optimize-assets.js)
  wild_iris_spring: '/TwilightGame/assets-optimized/tiles/wild_iris/iris_spring.png',
  wild_iris_summer: '/TwilightGame/assets-optimized/tiles/wild_iris/iris_summer.png',
  wild_iris_autumn: '/TwilightGame/assets-optimized/tiles/wild_iris/iris_autumn.png',
  wild_iris_winter: '/TwilightGame/assets-optimized/tiles/wild_iris/iris_winter.png',
  // Village flowers assets (seasonal variations - decorative flowers in village)
  // Optimized at 768x768 with SHOWCASE_QUALITY
  village_flowers_spring: '/TwilightGame/assets-optimized/tiles/village/flowers_village_spring.png',
  village_flowers_summer: '/TwilightGame/assets-optimized/tiles/village/flowers_village_summer.png',
  village_flowers_autumn: '/TwilightGame/assets-optimized/tiles/village/flowers_village_autumn.png',
  village_flowers_winter: '/TwilightGame/assets-optimized/tiles/village/flowers_village_winter.png',
  // Pond flowers assets (seasonal variations - spring/summer use same sprite)
  pond_flowers_spring_summer: '/TwilightGame/assets-optimized/tiles/pond_flowers_spring_summer.png',
  pond_flowers_autumn: '/TwilightGame/assets-optimized/tiles/pond_flowers_autumn.png',
  pond_flowers_winter: '/TwilightGame/assets-optimized/tiles/pond_flowers_winter.png',
  // Brambles assets (seasonal variations - thorny obstacles)
  brambles_spring: '/TwilightGame/assets-optimized/tiles/brambles/brambles_spring.png',
  brambles_summer: '/TwilightGame/assets-optimized/tiles/brambles/brambles_summer.png',
  brambles_autumn: '/TwilightGame/assets-optimized/tiles/brambles/brambles_autumn.png',
  brambles_winter: '/TwilightGame/assets-optimized/tiles/brambles/brambles_winter.png',
  // Hazel bush assets (seasonal variations - wild forageable bushes)
  hazel_bush_spring: '/TwilightGame/assets-optimized/tiles/forest/hazel_bush_spring.png',
  hazel_bush_summer: '/TwilightGame/assets-optimized/tiles/forest/hazel_bush_summer.png',
  hazel_bush_autumn: '/TwilightGame/assets-optimized/tiles/forest/hazel_bush_autumn.png',
  hazel_bush_winter: '/TwilightGame/assets-optimized/tiles/forest/hazel_bush_winter.png',
  // Blueberry bush assets (seasonal variations - wild forageable bushes, 3x3)
  blueberry_bush_spring: '/TwilightGame/assets-optimized/tiles/forest/blueberry_bush_spring.png',
  blueberry_bush_summer: '/TwilightGame/assets-optimized/tiles/forest/blueberry_bush_summer.png',
  blueberry_bush_autumn: '/TwilightGame/assets-optimized/tiles/forest/blueberry_bush_autumn.png',
  blueberry_bush_winter: '/TwilightGame/assets-optimized/tiles/forest/blueberry_bush_winter.png',
  // Wild strawberry assets (seasonal variations - forageable in forest)
  wild_strawberry_spring:
    '/TwilightGame/assets-optimized/tiles/wild_strawberry/wild_strawberry_spring.png',
  wild_strawberry_summer:
    '/TwilightGame/assets-optimized/tiles/wild_strawberry/wild_strawberry_summer.png',
  wild_strawberry_autumn:
    '/TwilightGame/assets-optimized/tiles/wild_strawberry/wild_strawberry_autumn.png',
  // Deep Forest plants (sacred grove exclusives)
  moonpetal_spring_summer_day:
    '/TwilightGame/assets-optimized/tiles/deep_forest/moonpetal_spring_summer_day.png',
  moonpetal_spring_summer_night:
    '/TwilightGame/assets-optimized/tiles/deep_forest/moonpetal_spring_summer_night.png',
  moonpetal_autumn: '/TwilightGame/assets-optimized/tiles/deep_forest/moonpetal_autumn.png',
  // Addersmeat (night-blooming magical flower, dormant in winter)
  addersmeat_spring_summer_day:
    '/TwilightGame/assets-optimized/tiles/deep_forest/addersmeat_spring-summer_day.png',
  addersmeat_spring_summer_night:
    '/TwilightGame/assets-optimized/tiles/deep_forest/addersmeat_spring-summer_night.png',
  addersmeat_autumn: '/TwilightGame/assets-optimized/tiles/deep_forest/addersmeat_autumn.png',
  // Wolfsbane (2x2 forageable magical plant)
  wolfsbane: '/TwilightGame/assets-optimized/tiles/wolfsbane.png',
  tree_mushrooms_spring_summer_autumn:
    '/TwilightGame/assets-optimized/tiles/deep_forest/tree_mushrooms_spring-summer-autumn.png',
  tree_mushrooms_winter:
    '/TwilightGame/assets-optimized/tiles/deep_forest/tree_mushrooms_winter.png',
  // Mushroom Forest plants (mushroom forest exclusives)
  luminescent_toadstool:
    '/TwilightGame/assets-optimized/tiles/mushroomMap/luminecent_toadstool.png',
  // Mushroom house assets (animated 6x6 building with subtle animation)
  mushroom_house_01: '/TwilightGame/assets-optimized/tiles/mushroomMap/mushroom_house01.png',
  mushroom_house_02: '/TwilightGame/assets-optimized/tiles/mushroomMap/mushroom_house02.png',
  // Branch (walkable ground decoration)
  branch: '/TwilightGame/assets-optimized/tiles/mushroomMap/branch.png',
  // Mushroom cluster (2x2 decorative mushrooms for mushroom forest and procedural forests)
  mushroom_cluster: '/TwilightGame/assets-optimized/tiles/mushroomMap/mushroom.png',
  // Common forageable plants
  mustard_flower: '/TwilightGame/assets-optimized/tiles/mustard_flower.png',
  shrinking_violet: '/TwilightGame/assets-optimized/tiles/forest/shrinking_violet.png',
  frost_flower_bloom: '/TwilightGame/assets-optimized/tiles/ruins/frost_flower_bloom.png',
  // Ruins entrance assets (seasonal variations - 8x8 multi-tile sprite)
  ruins_entrance_spring_summer:
    '/TwilightGame/assets-optimized/tiles/ruins/ruins_entrance_spring-summer.png',
  ruins_entrance_autumn: '/TwilightGame/assets-optimized/tiles/ruins/ruins_entrance_autumn.png',
  ruins_entrance_winter: '/TwilightGame/assets-optimized/tiles/ruins/ruins_entrance_winter.png',
  // Witch hut asset
  witch_hut: '/TwilightGame/assets-optimized/witchhut/witch_hut.png',
  // Cauldron animation frames
  cauldron_1: '/TwilightGame/assets-optimized/cauldron/cauldron_1.png',
  cauldron_2: '/TwilightGame/assets-optimized/cauldron/cauldron_2.png',
  cauldron_3: '/TwilightGame/assets-optimized/cauldron/cauldron_3.png',
  cauldron_4: '/TwilightGame/assets-optimized/cauldron/cauldron_4.png',
  cauldron_5: '/TwilightGame/assets-optimized/cauldron/cauldron_5.png',
  cauldron_6: '/TwilightGame/assets-optimized/cauldron/cauldron_6.png',
  cauldron_7: '/TwilightGame/assets-optimized/cauldron/cauldron_7.png',
  cauldron_8: '/TwilightGame/assets-optimized/cauldron/cauldron_8.png',
  cauldron_9: '/TwilightGame/assets-optimized/cauldron/cauldron_9.png',
  // Stream animation frames (flowing water for forest levels)
  stream_1: '/TwilightGame/assets/animations/stream/stream1.png',
  stream_2: '/TwilightGame/assets/animations/stream/stream2.png',
  stream_3: '/TwilightGame/assets/animations/stream/stream3.png',
  // Giant mushroom assets (magical mushrooms for witch hut area)
  giant_mushroom: '/TwilightGame/assets-optimized/tiles/giant_mushroom.png',
  giant_mushroom_winter: '/TwilightGame/assets-optimized/tiles/giant_mushroom_winter.png',
  // Sambuca bush assets (seasonal bushes for witch hut area)
  sambuca_bush_spring: '/TwilightGame/assets-optimized/tiles/sambuca_bush_spring.png',
  sambuca_bush_summer: '/TwilightGame/assets-optimized/tiles/sambuca_bush_summer.png',
  sambuca_bush_autumn: '/TwilightGame/assets-optimized/tiles/sambuca_bush_autumn.png',
  sambuca_bush_winter: '/TwilightGame/assets-optimized/tiles/sambuca_bush_winter.png',
  // Dead spruce tree assets (barren tree for forest areas)
  dead_spruce: '/TwilightGame/assets-optimized/tiles/forest/dead_spruce.png',
  dead_spruce_winter: '/TwilightGame/assets-optimized/tiles/forest/dead_spruce_winter.png',
  // Small fir tree assets (walkable underbrush for forest areas)
  fir_tree_small: '/TwilightGame/assets-optimized/tiles/forest/fir_tree_small.png',
  fir_tree_small_winter: '/TwilightGame/assets-optimized/tiles/forest/fir_tree_small_winter.png',
  // Small spruce tree assets (solid obstacle for forest areas)
  spruce_tree_small: '/TwilightGame/assets-optimized/tiles/forest/spruce_tree_small.png',
  spruce_tree_small_winter:
    '/TwilightGame/assets-optimized/tiles/forest/spruce_tree_small_winter.png',
  // Forest pond assets (6x6 multi-tile sprite for random forests, seasonal variations)
  forest_pond_spring_summer:
    '/TwilightGame/assets-optimized/tiles/forest_lake/pond_forest_spring-summer.png',
  forest_pond_autumn: '/TwilightGame/assets-optimized/tiles/forest_lake/pond_forest_autumn.png',
  forest_pond_winter: '/TwilightGame/assets-optimized/tiles/forest_lake/pond_forest_winter.png',
  // Magical lake asset (12x12 multi-tile sprite for forest lake scene)
  // Optimized at 2048px with showcase quality (97%, compression level 3)
  magical_lake: '/TwilightGame/assets-optimized/tiles/lake/magical_lake.png',
  // Bear house assets (seasonal variations for bear cave clearing)
  // Use original high-res 2100x2100 sprites for sharp rendering (multi-tile structure)
  bear_house_spring_summer: '/TwilightGame/assets/tiles/bear_cave/bear_cave_spring-summer.png',
  bear_house_autumn: '/TwilightGame/assets/tiles/bear_cave/bear_cave_autumn.png',
  bear_house_winter: '/TwilightGame/assets/tiles/bear_cave/bear_cave_winter.png',
  // Bee hive asset (no seasonality, appears in bear cave area)
  bee_hive: '/TwilightGame/assets-optimized/tiles/bear_cave/bee_hive.png',
};

// Farming assets - Use optimized versions for better performance
export const farmingAssets = {
  fallow_soil_1: '/TwilightGame/assets-optimized/farming/fallow_soil_1.png',
  fallow_soil_2: '/TwilightGame/assets-optimized/farming/fallow_soil_2.png',
  tilled: '/TwilightGame/assets-optimized/farming/tilled.png',
  seedling: '/TwilightGame/assets-optimized/farming/seedling.png',
  plant_pea_young: '/TwilightGame/assets-optimized/farming/plant_pea_young.png',
  plant_pea_adult: '/TwilightGame/assets-optimized/farming/plant_pea_adult.png',
  plant_salad_young: '/TwilightGame/assets-optimized/farming/salad_young.png',
  plant_salad_adult: '/TwilightGame/assets-optimized/farming/salad_adult.png',
  plant_strawberry_young: '/TwilightGame/assets-optimized/farming/plant_strawberry_young.png',
  plant_strawberry_adult: '/TwilightGame/assets-optimized/farming/plant_strawberry_adult.png',
  plant_sunflower_young: '/TwilightGame/assets-optimized/farming/sunflower_young.png',
  plant_sunflower_adult: '/TwilightGame/assets-optimized/farming/sunflower_adult.png',
  plant_tomato_young: '/TwilightGame/assets-optimized/farming/tomato_young.png',
  plant_tomato_adult: '/TwilightGame/assets-optimized/farming/tomato_adult.png',
  plant_chili_young: '/TwilightGame/assets-optimized/farming/chili_young.png',
  plant_chili_adult: '/TwilightGame/assets-optimized/farming/chili_adult.png',
  plant_spinach_young: '/TwilightGame/assets-optimized/farming/spinach_young.png',
  plant_spinach_adult: '/TwilightGame/assets-optimized/farming/spinach_adult.png',
  plant_broccoli_young: '/TwilightGame/assets-optimized/farming/broccoli_young.png',
  plant_broccoli_adult: '/TwilightGame/assets-optimized/farming/broccoli_adult.png',
  plant_fairy_bluebell_seed: '/TwilightGame/assets-optimized/farming/fairy_bluebell_seed.png',
  plant_fairy_bluebell_young: '/TwilightGame/assets-optimized/farming/fairy_bluebell_young.png',
  plant_fairy_bluebell_adult: '/TwilightGame/assets-optimized/farming/fairy_bluebell_adult.png',
  plant_onion_young: '/TwilightGame/assets-optimized/farming/onion_young.png',
  plant_onion_adult: '/TwilightGame/assets-optimized/farming/onion_adult.png',
  plant_pumpkin_young: '/TwilightGame/assets-optimized/farming/pumpkin_young.png',
  plant_pumpkin_adult: '/TwilightGame/assets-optimized/farming/pumpkin_adult.png',
  wilted_plant: '/TwilightGame/assets-optimized/farming/wilted_plant.png',
  farm_fence: '/TwilightGame/assets-optimized/farming/farm_fence.png',
};

// Cooking assets - Prepared food items (cooked dishes)
export const cookingAssets = {
  chocolate_cake: '/TwilightGame/assets-optimized/cooking/chocolate_cake.png',
  cookies: '/TwilightGame/assets-optimized/cooking/cookies.png',
  crepes: '/TwilightGame/assets-optimized/cooking/crepes.png',
  cup_of_tea: '/TwilightGame/assets-optimized/cooking/cup_of_tea.png',
  french_toast: '/TwilightGame/assets-optimized/cooking/french_toast.png',
  pickled_onion: '/TwilightGame/assets-optimized/cooking/pickled_onion.png',
  potato_pizza: '/TwilightGame/assets-optimized/cooking/potato_pizza.png',
  roast_dinner: '/TwilightGame/assets-optimized/cooking/roast_dinner.png',
  spaghetti_dish: '/TwilightGame/assets-optimized/cooking/spaghetti_dish.png',
};

// Grocery assets - Cooking ingredients (raw items from shop)
export const groceryAssets = {
  allspice: '/TwilightGame/assets-optimized/items/grocery/allspice.png',
  baking_powder: '/TwilightGame/assets-optimized/items/grocery/baking_powder.png',
  basil: '/TwilightGame/assets-optimized/items/grocery/basil.png',
  bread: '/TwilightGame/assets-optimized/items/grocery/bread.png',
  butter: '/TwilightGame/assets-optimized/items/grocery/butter.png',
  canned_tomato: '/TwilightGame/assets-optimized/items/grocery/canned_tomato.png',
  canned_tuna: '/TwilightGame/assets-optimized/items/grocery/canned_tuna.png',
  carrot_bunch: '/TwilightGame/assets-optimized/items/grocery/carrot_bunch.png',
  chocolate_bar: '/TwilightGame/assets-optimized/items/grocery/chocolate_bar.png',
  chili_crop: '/TwilightGame/assets-optimized/items/grocery/chili_crop.png',
  chili_seeds: '/TwilightGame/assets-optimized/items/grocery/chili_seeds.png',
  cinnamon: '/TwilightGame/assets-optimized/items/grocery/cinnamon.png',
  cocoa_powder: '/TwilightGame/assets-optimized/items/grocery/cocoa_powder.png',
  cream: '/TwilightGame/assets-optimized/items/grocery/cream.png',
  curry: '/TwilightGame/assets-optimized/items/grocery/curry.png',
  dried_spaghetti: '/TwilightGame/assets-optimized/items/grocery/dried_spaghetti.png',
  egg: '/TwilightGame/assets-optimized/items/grocery/egg.png',
  flour: '/TwilightGame/assets-optimized/items/grocery/flour.png',
  gravy: '/TwilightGame/assets-optimized/items/grocery/gravy.png',
  hazelnuts: '/TwilightGame/assets-optimized/items/grocery/hazelnuts.png',
  honey: '/TwilightGame/assets-optimized/items/grocery/honey.png',
  meat: '/TwilightGame/assets-optimized/items/grocery/meat.png',
  milk: '/TwilightGame/assets-optimized/items/grocery/milk.png',
  minced_meat: '/TwilightGame/assets-optimized/items/grocery/minced_meat.png',
  rice: '/TwilightGame/assets-optimized/items/grocery/rice.png',
  rosemary: '/TwilightGame/assets-optimized/items/grocery/rosemary.png',
  sack_of_potatoes: '/TwilightGame/assets-optimized/items/grocery/sack_of_potatoes.png',
  salt: '/TwilightGame/assets-optimized/items/grocery/salt.png',
  sugar: '/TwilightGame/assets-optimized/items/grocery/sugar.png',
  tea: '/TwilightGame/assets-optimized/items/grocery/tea.png',
  thyme: '/TwilightGame/assets-optimized/items/grocery/thyme.png',
  tomato: '/TwilightGame/assets-optimized/items/grocery/tomato.png',
  vanilla_pods: '/TwilightGame/assets-optimized/items/grocery/vanilla_pods.png',
  yeast: '/TwilightGame/assets-optimized/items/grocery/yeast.png',
  olive_oil: '/TwilightGame/assets-optimized/items/grocery/olive_oil.png',
  sunflower_oil: '/TwilightGame/assets-optimized/items/grocery/sunflower_oil.png',
  strawberry_jam: '/TwilightGame/assets-optimized/items/grocery/strawberry_jam.png',
  cheese: '/TwilightGame/assets-optimized/items/grocery/cheese.png',
  spinach_bundle: '/TwilightGame/assets-optimized/items/grocery/spinach_bundle.png',
  almonds: '/TwilightGame/assets-optimized/items/grocery/almonds.png',
  salad_head: '/TwilightGame/assets-optimized/items/grocery/salad_head.png',
  broccoli_head: '/TwilightGame/assets-optimized/items/grocery/broccoli_head.png',
  blueberries_crop: '/TwilightGame/assets-optimized/items/grocery/blueberries_crop.png',
  onion_bunch: '/TwilightGame/assets-optimized/items/grocery/onion_bunch.png',
  onion_sets: '/TwilightGame/assets-optimized/items/grocery/onion_sets.png',
  seed_potatoes: '/TwilightGame/assets-optimized/items/grocery/seed_potatoes.png',
  pumpkin: '/TwilightGame/assets-optimized/items/grocery/pumpkin.png',
  pumpkin_seeds: '/TwilightGame/assets-optimized/items/grocery/pumpkin_seeds.png',
  pepper: '/TwilightGame/assets-optimized/items/grocery/pepper.png',
  vinegar: '/TwilightGame/assets-optimized/items/grocery/vinegar.png',
  mint: '/TwilightGame/assets-optimized/items/grocery/mint.png',
};

// Magical ingredient assets (for witch shop - sellable but not purchasable)
export const magicalAssets = {
  dragonfly_wings: '/TwilightGame/assets-optimized/items/magical/forageable/dragonfly_wings.png',
  moonpetal_flower: '/TwilightGame/assets-optimized/items/magical/forageable/moonpetal_flower.png',
  addersmeat_flower:
    '/TwilightGame/assets-optimized/items/magical/forageable/addersmeat_flower.png',
  luminescent_toadstool:
    '/TwilightGame/assets-optimized/items/magical/forageable/luminescent_toadstool_ingredient.png',
  eye_of_newt: '/TwilightGame/assets-optimized/items/magical/forageable/eye_of_newt.png',
  wolfsbane_ingredient:
    '/TwilightGame/assets-optimized/items/magical/forageable/wolfsbane_ingredient.png',
  shrinking_violet_ingredient:
    '/TwilightGame/assets-optimized/items/magical/forageable/shrinking_violet_ingredient.png',
  frost_flower: '/TwilightGame/assets-optimized/items/magical/forageable/frost_flower.png',
  ghost_lichen: '/TwilightGame/assets-optimized/items/magical/forageable/ghost_lichen.png',
};

// Potion assets - Brewed magical potions (results from brewing recipes)
// These are produced via the MagicManager brewing system, similar to how food is produced via cooking
export const potionAssets = {
  friendship_elixir: '/TwilightGame/assets-optimized/items/magical/potions/friendship_elixir.png',
  bitter_grudge: '/TwilightGame/assets-optimized/items/magical/potions/bitter_grudge.png',
  glamour_draught: '/TwilightGame/assets-optimized/items/magical/potions/glamour_draught.png',
  beastward_balm: '/TwilightGame/assets-optimized/items/magical/potions/beastward_balm.png',
  wakefulness_brew: '/TwilightGame/assets-optimized/items/magical/potions/wakefulness_brew.png',
  revealing_tonic: '/TwilightGame/assets-optimized/items/magical/potions/revealing_tonic.png',
  raincaller: '/TwilightGame/assets-optimized/items/magical/potions/raincaller.png',
  sunburst: '/TwilightGame/assets-optimized/items/magical/potions/sunburst.png',
  snowglobe: '/TwilightGame/assets-optimized/items/magical/potions/snowglobe.png',
  cherry_blossom: '/TwilightGame/assets-optimized/items/magical/potions/cherry_blossom.png',
  mistweaver: '/TwilightGame/assets-optimized/items/magical/potions/mistweaver.png',
  verdant_surge: '/TwilightGame/assets-optimized/items/magical/potions/verdant_surge.png',
  healing_salve: '/TwilightGame/assets-optimized/items/magical/potions/healing_salve.png',
  drink_me: '/TwilightGame/assets-optimized/items/magical/potions/drink_me.png',
  eat_me: '/TwilightGame/assets-optimized/items/magical/potions/eat_me.png',
  // Level 3: Full Witch potions
  dawns_herald: '/TwilightGame/assets-optimized/items/magical/potions/dawns_herald.png',
  harvest_moon: '/TwilightGame/assets-optimized/items/magical/potions/harvest_moon.png',
  homeward: '/TwilightGame/assets-optimized/items/magical/potions/homeward.png',
  quality_blessing: '/TwilightGame/assets-optimized/items/magical/potions/quality_blessing.png',
  time_skip: '/TwilightGame/assets-optimized/items/magical/potions/time_skip.png',
  // Quest potions (received as gifts, not brewed)
  fairy_form_potion: '/TwilightGame/assets-optimized/items/magical/quest/fairy_form_potion.png',
};

// NPC assets - Use optimized versions (1024px, 97% quality) for in-game, originals for portraits
export const npcAssets = {
  little_girl: '/TwilightGame/assets-optimized/npcs/little_girl.png',
  little_girl_portrait: '/TwilightGame/assets/npcs/little_girl.png',
  // Cat assets: Using originals (in subfolder, not auto-optimized by script)
  cat_sleeping_01: '/TwilightGame/assets/npcs/cat/cat_sleeping_01.png',
  cat_sleeping_02: '/TwilightGame/assets/npcs/cat/cat_sleeping_02.png',
  cat_sleeping_angry: '/TwilightGame/assets/npcs/cat/cat_sleeping_angry.png',
  cat_stand_01: '/TwilightGame/assets/npcs/cat/cat_stand_01.png',
  cat_stand_02: '/TwilightGame/assets/npcs/cat/cat_stand_02.png',
  cat_portrait: '/TwilightGame/assets/npcs/cat/cat_sleeping_01.png',
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
  dog_portrait: '/TwilightGame/assets/npcs/dog_01.png',
  mum_01: '/TwilightGame/assets-optimized/npcs/mum_01.png',
  mum_02: '/TwilightGame/assets-optimized/npcs/mum_02.png',
  mum_portrait: '/TwilightGame/assets/npcs/mum_01.png',
  // Umbra Wolf assets (forest creature)
  umbrawolf_standing1: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_standing1.png',
  umbrawolf_standing2: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_standing2.png',
  umbrawolf_sitting_01: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_sitting_01.png',
  umbrawolf_sitting_02: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_sitting_02.png',
  umbrawolf_front: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_front.png',
  umbrawolf_back: '/TwilightGame/assets-optimized/npcs/umbra_wolf/umbrawolf_back.png',
  umbrawolf_portrait: '/TwilightGame/assets/npcs/umbra_wolf/umbrawolf_front.png',
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
  // Bunnyfly assets (forest creature - butterfly-bunny hybrid)
  // Using originals (1000x1000) for maximum quality - small creatures need crisp detail
  bunnyfly_01: '/TwilightGame/assets/npcs/bunnyfly_01.png',
  bunnyfly_02: '/TwilightGame/assets/npcs/bunnyfly_02.png',
  bunnyfly_portrait: '/TwilightGame/assets/npcs/bunnyfly_01.png',
  // Duck assets (pond creature)
  duck_01: '/TwilightGame/assets-optimized/npcs/duck_01.png',
  duck_02: '/TwilightGame/assets-optimized/npcs/duck_02.png',
  duck_portrait: '/TwilightGame/assets/npcs/duck_01.png',
  // Cow assets (farm animal - gives milk)
  cow_01: '/TwilightGame/assets/npcs/cow/cow_01.png',
  cow_02: '/TwilightGame/assets/npcs/cow/cow_02.png',
  cow_portrait: '/TwilightGame/assets/npcs/cow/cow_01.png',
  // Mother Sea assets (mystical lake spirit - rises from the magical lake)
  mother_sea_01: '/TwilightGame/assets-optimized/npcs/mother_sea/mother-sea_01.png',
  mother_sea_02: '/TwilightGame/assets-optimized/npcs/mother_sea/mother-sea_02.png',
  mother_sea_portrait: '/TwilightGame/assets/npcs/mother_sea/mother-sea_01.png',
  // Mushra assets (friendly mushroom creature)
  mushra_01: '/TwilightGame/assets-optimized/npcs/mushra/mushra_01.png',
  mushra_02: '/TwilightGame/assets-optimized/npcs/mushra/mushra_02.png',
  mushra_portrait: '/TwilightGame/assets/npcs/mushra/mushra_01.png',
  // Deer assets (forest creature)
  deer_01: '/TwilightGame/assets-optimized/npcs/deer/deer_01.png',
  deer_02: '/TwilightGame/assets-optimized/npcs/deer/deer_02.png',
  deer_03: '/TwilightGame/assets-optimized/npcs/deer/deer_03.png',
  deer_portrait: '/TwilightGame/assets/npcs/deer/deer_01.png',
  // Puffle assets (cute forest creature, always appears with Suffle)
  puffle_01: '/TwilightGame/assets-optimized/npcs/puffle/puffle_01.png',
  puffle_02: '/TwilightGame/assets-optimized/npcs/puffle/puffle_02.png',
  puffle_portrait: '/TwilightGame/assets/npcs/puffle/puffle_01.png',
  // Suffle assets (cute forest creature, always appears with Puffle)
  suffle_01: '/TwilightGame/assets-optimized/npcs/suffle/suffle_01.png',
  suffle_02: '/TwilightGame/assets-optimized/npcs/suffle/suffle_02.png',
  suffle_portrait: '/TwilightGame/assets/npcs/suffle/suffle_01.png',
  // Professor Birdimen assets (scholarly bird character)
  professor_birdimen_01: '/TwilightGame/assets/npcs/professor_birdimen/professor_birdimen_01.png',
  professor_birdimen_02: '/TwilightGame/assets/npcs/professor_birdimen/professor_birdimen_02.png',
  professor_birdimen_portrait:
    '/TwilightGame/assets/npcs/professor_birdimen/professor_birdimen_01.png',
  // Possum assets (forest creature - plays dead when approached)
  possum_walking_01: '/TwilightGame/assets/npcs/possum/possum_walking01.png',
  possum_walking_02: '/TwilightGame/assets/npcs/possum/possum_walking02.png',
  possum_walking_03: '/TwilightGame/assets/npcs/possum/possum_walking03.png',
  possum_sitting: '/TwilightGame/assets/npcs/possum/possum_sitting.png',
  possum_dead: '/TwilightGame/assets/npcs/possum/possum_dead.png',
  possum_portrait: '/TwilightGame/assets/npcs/possum/possum_dead.png',
};

// Player assets (add your custom sprites here when ready)
export const playerAssets = {
  // Example: down_0: '/TwilightGame/assets/player/down_0.png',
};

// Fairy transformation assets - Used when player is transformed into a fairy
// Directional sprites with 2-frame animation per direction
// Right-facing sprites use flipped left sprites (handled in sprite rendering)
export const fairyAssets = {
  // Down-facing
  down_01: '/TwilightGame/assets/character1/fairy/down_fairy_spell01.png',
  down_02: '/TwilightGame/assets/character1/fairy/down_fairy_spell02.png',
  // Up-facing
  up_01: '/TwilightGame/assets/character1/fairy/up_fairy_spell01.png',
  up_02: '/TwilightGame/assets/character1/fairy/up_fairy_spell02.png',
  // Left-facing (also used for right with horizontal flip)
  left_01: '/TwilightGame/assets/character1/fairy/left_fairy_spell01.png',
  left_02: '/TwilightGame/assets/character1/fairy/left_fairy_spell02.png',
};

// Animation assets - Animated GIFs for environmental effects
// Note: Most GIFs are optimized by the asset pipeline (resized to 512x512 with gifsicle)
// Some GIFs use original size when specified (e.g., dragonfly_stream)
export const animationAssets = {
  cherry_spring_petals: '/TwilightGame/assets-optimized/animations/cherry_spring_petals.gif',
  dragonfly_stream: '/TwilightGame/assets/animations/dragonfly_stream.gif', // Use original size
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

// UI assets - Interface elements (bookshelf, wallet, etc.)
export const uiAssets = {
  bookshelf_base: '/TwilightGame/assets-optimized/ui/bookshelf_base.png',
  book_recipes: '/TwilightGame/assets-optimized/ui/book_recipes.png',
  book_magic: '/TwilightGame/assets-optimized/ui/book_magic.png',
  book_journal: '/TwilightGame/assets-optimized/ui/book_journal.png',
  wallet: '/TwilightGame/assets-optimized/ui/wallet.png',
  satchel: '/TwilightGame/assets-optimized/ui/satchel.png',
  // Open book UI - cottagecore book backgrounds for recipe/magic menus
  openbook_ui: '/TwilightGame/assets/ui/openbook_ui.png',
  magicbook_ui: '/TwilightGame/assets/ui/magicbook_ui.PNG',
};

// Dialogue UI assets - Animated dialogue window frames
export const dialogueAssets = {
  // Animation frames for dialogue window (subtle animation effect)
  frame_01: '/TwilightGame/assets/dialogue/dialog_01.png',
  frame_02: '/TwilightGame/assets/dialogue/dialog_02.png',
  frame_03: '/TwilightGame/assets/dialogue/dialog_03.png',
  frame_04: '/TwilightGame/assets/dialogue/dialog_04.png',
  frame_05: '/TwilightGame/assets/dialogue/dialog_05.png',
  frame_06: '/TwilightGame/assets/dialogue/dialog_06.png',
};

// All dialogue frames as array for animation cycling
export const dialogueFrames = [
  '/TwilightGame/assets/dialogue/dialog_01.png',
  '/TwilightGame/assets/dialogue/dialog_02.png',
  '/TwilightGame/assets/dialogue/dialog_03.png',
  '/TwilightGame/assets/dialogue/dialog_04.png',
  '/TwilightGame/assets/dialogue/dialog_05.png',
  '/TwilightGame/assets/dialogue/dialog_06.png',
];

// Dialogue character sprites - Special artwork for dialogue scenes (larger, more expressive)
// These are optional - NPCs will fall back to portraitSprite > sprite if not defined
// Organised by NPC with expression variants (default, smile, happy, thinky, etc.)
export const dialogueSpriteAssets = {
  // Mum dialogue expressions (default, happy, smile)
  mum: {
    default: '/TwilightGame/assets/npcs/mum/dialogue/mum_default.png',
    happy: '/TwilightGame/assets/npcs/mum/dialogue/mum_happy.png',
    smile: '/TwilightGame/assets/npcs/mum/dialogue/mum_smile.png',
  },
  // Add more NPCs as artwork becomes available
  // shopkeeper: { default: '...', happy: '...', etc. },
};

// Item assets - Inventory items, tools, seeds, resources
export const itemAssets = {
  hoe: '/TwilightGame/assets-optimized/items/hoe.png',
  watering_can: '/TwilightGame/assets-optimized/items/watering_can.png',
  water: '/TwilightGame/assets-optimized/items/water.png',
  carrot_seeds: '/TwilightGame/assets-optimized/items/carrot_seeds.png',
  radish_seeds: '/TwilightGame/assets-optimized/items/radish_seeds.png',
  tomato_seeds: '/TwilightGame/assets-optimized/items/tomato_seeds.png',
  salad_seeds: '/TwilightGame/assets-optimized/items/salad_seeds.png',
  spinach_seeds: '/TwilightGame/assets-optimized/items/spinach_seeds.png',
  sunflower_seeds: '/TwilightGame/assets-optimized/items/sunflower_seeds.png',
  broccoli_seeds: '/TwilightGame/assets-optimized/items/broccoli_seeds.png',
  cucumber_seeds: '/TwilightGame/assets-optimized/items/cucumber_seeds.png',
  melon_seeds: '/TwilightGame/assets-optimized/items/melon_seeds.png',
  wild_seeds: '/TwilightGame/assets-optimized/items/wild_seeds.png',
  fairy_bluebell_seeds: '/TwilightGame/assets-optimized/farming/fairy_bluebell_seed.png',
  radishes: '/TwilightGame/assets-optimized/items/radishes.png',
  blackberries: '/TwilightGame/assets-optimized/items/blackberries.png',
  strawberry: '/TwilightGame/assets-optimized/items/strawberry.png',
  // Tools - Quest and special items
  feather_duster: '/TwilightGame/assets-optimized/items/feather_duster.png',
  // Decorations
  sunflower_bouquet:
    '/TwilightGame/assets-optimized/items/decoration/decoration_sunflower_bouquet.png',
  easel: '/TwilightGame/assets-optimized/items/crafting/easel.png',
};

// Audio assets - Sound effects, music, and ambient sounds
// Note: Add audio files to /public/assets/audio/ and they will be auto-served
// Recommended format: OGG (best compression) or MP3 (wide compatibility)
import { AudioAssetConfig } from './utils/AudioManager';

export const audioAssets: Record<string, AudioAssetConfig> = {
  // === Sound Effects - Farming ===
  sfx_till: {
    url: '/TwilightGame/assets/audio/sfx/farming/digging.mp3',
    category: 'sfx',
  },
  sfx_hoe: {
    url: '/TwilightGame/assets/audio/sfx/farming/hoeing.mp3',
    category: 'sfx',
  },
  sfx_watering: {
    url: '/TwilightGame/assets/audio/sfx/farming/watering.mp3',
    category: 'sfx',
  },
  sfx_harvest: {
    url: '/TwilightGame/assets/audio/sfx/farming/harvest.mp3',
    category: 'sfx',
  },

  // === Sound Effects - Cooking ===
  sfx_frying: {
    url: '/TwilightGame/assets/audio/sfx/cooking/frying.mp3',
    category: 'sfx',
  },

  // === Sound Effects - Transitions ===
  sfx_door_open: {
    url: '/TwilightGame/assets/audio/sfx/transitions/door_opening.mp3',
    category: 'sfx',
  },

  // === Sound Effects - Magic ===
  sfx_magic_transition: {
    url: '/TwilightGame/assets/audio/sfx/magic/mixkit-magic-transition-sweep-presentation-2638.m4a',
    category: 'sfx',
  },

  // === Sound Effects - NPCs ===
  sfx_ducks_quack: {
    url: '/TwilightGame/assets/audio/sfx/npcs/ducks-quack-362421.mp3',
    category: 'sfx',
  },
  sfx_meow_01: {
    url: '/TwilightGame/assets/audio/sfx/npcs/meow01.mp3',
    category: 'sfx',
  },
  sfx_meow_02: {
    url: '/TwilightGame/assets/audio/sfx/npcs/meow02.mp3',
    category: 'sfx',
  },
  sfx_meow_03: {
    url: '/TwilightGame/assets/audio/sfx/npcs/meow03.mp3',
    category: 'sfx',
  },
  // Dog barks (extensible for more bark variations)
  sfx_bark_01: {
    url: '/TwilightGame/assets/audio/sfx/npcs/bark01.mp3',
    category: 'sfx',
  },

  // === Music - Map Themes ===
  // Each map can have its own background music with crossfade transitions
  music_village: {
    url: '/TwilightGame/assets/audio/music/twilight-village.m4a',
    category: 'music',
    loop: true,
  },
  music_village_autumn: {
    url: '/TwilightGame/assets/audio/music/village-autumn.m4a',
    category: 'music',
    loop: true,
  },
  music_forest: {
    url: '/TwilightGame/assets/audio/music/twilight-forest.m4a',
    category: 'music',
    loop: true,
  },

  // === Ambient - Environmental Sounds ===
  // Looping background ambiance for atmosphere
  ambient_rain_light: {
    url: '/TwilightGame/assets/audio/ambient/mixkit-light-rain-loop-2393.m4a',
    category: 'ambient',
    loop: true,
  },
  ambient_rain_thunder: {
    url: '/TwilightGame/assets/audio/ambient/mixkit-rain-and-thunder-storm-2390.m4a',
    category: 'ambient',
    loop: true,
  },
  ambient_thunderstorm: {
    url: '/TwilightGame/assets/audio/ambient/mixkit-thunderstorm-and-rain-loop-2402.m4a',
    category: 'ambient',
    loop: true,
  },
  ambient_blizzard: {
    url: '/TwilightGame/assets/audio/ambient/mixkit-blizzard-cold-winds-1153.m4a',
    category: 'ambient',
    loop: true,
  },
  ambient_birds: {
    url: '/TwilightGame/assets/audio/ambient/mixkit-little-birds-singing-in-the-trees-17.m4a',
    category: 'ambient',
    loop: true,
  },
  ambient_running_stream: {
    url: '/TwilightGame/assets/audio/ambient/running_stream.mp3',
    category: 'ambient',
    loop: true,
  },
  ambient_countryside_summer: {
    url: '/TwilightGame/assets/audio/ambient/alex_jauk-countryside-ambience-207588.mp3',
    category: 'ambient',
    loop: true,
  },
};
