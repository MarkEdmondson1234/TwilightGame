/**
 * Ingredient Encyclopaedia
 *
 * Diegetic reference data for the spellbook's ingredient encyclopaedia chapter.
 * Each entry provides a fictional Latin name, type classification, location hints,
 * seasonal availability, and herbalism-inspired lore text.
 *
 * Item IDs reference the canonical definitions in data/items.ts (MAGICAL_INGREDIENT category).
 */

import { getItem } from './items';

export interface EncyclopaediaEntry {
  itemId: string;
  latinName: string;
  type: string;
  canBeFound: string;
  seasonsAvailable: string;
  lore: string;
}

const ENCYCLOPAEDIA_DATA: Record<string, EncyclopaediaEntry> = {
  addersmeat: {
    itemId: 'addersmeat',
    latinName: 'Vipera stellata',
    type: 'Flower',
    canBeFound: 'Deep forest glades, blooming only after dark beneath a clear sky.',
    seasonsAvailable: 'Spring & Summer (night only)',
    lore: 'Named for the serpentine curl of its petals, addersmeat has long been associated with cunning and subtlety. Country apothecaries once hung dried sprigs above their doorways to ward off dishonesty. The flower opens only after nightfall, releasing a faint scent of warm honey that attracts lunar moths. Its starlike luminescence fades within moments of being picked, though the magical properties remain potent for several days.',
  },

  dawn_dew: {
    itemId: 'dawn_dew',
    latinName: 'Ros aurorae',
    type: 'Essence',
    canBeFound: 'Meadow grasses at the precise moment of sunrise.',
    seasonsAvailable: 'Year-round (dawn only)',
    lore: 'There is a fleeting instant when night yields to day — neither darkness nor light, but something altogether rarer. Dew collected in that sliver of time carries a golden shimmer and a warmth that defies explanation. Herbalists who rise before the sun swear it strengthens any potion of renewal or beginnings. The window for gathering is painfully brief: arrive a moment too late and you hold only common water.',
  },

  dragonfly_wings: {
    itemId: 'dragonfly_wings',
    latinName: 'Libellula iridescens',
    type: 'Animal Material',
    canBeFound: 'Near streams and ponds where dragonflies gather on warm days.',
    seasonsAvailable: 'Spring & Summer (daytime only)',
    lore: 'The iridescent wings shed by dragonflies shimmer with every colour of the rainbow when held to the light. Lighter than a whisper and stronger than they appear, these delicate membranes have been prized since ancient times for their association with swiftness and transformation. Folk tradition holds that a dragonfly sheds its wings willingly — they must never be taken by force, or their magic turns sour.',
  },

  eye_of_newt: {
    itemId: 'eye_of_newt',
    latinName: 'Sinapis oculus',
    type: 'Seed',
    canBeFound: 'Wild mustard flowers in meadows and field edges, or from the witch\'s shop.',
    seasonsAvailable: 'Spring & Summer',
    lore: 'Despite the ominous name beloved of storybook witches, "eye of newt" is simply the old country term for mustard seeds — small, round, and dark as a tiny eye. The confusion has persisted for centuries, much to the amusement of actual practitioners. These pungent little seeds carry a surprising warmth that enlivens base potions and prevents curdling. Every witch\'s pantry keeps a generous supply.',
  },

  feather: {
    itemId: 'feather',
    latinName: 'Pluma passerina',
    type: 'Animal Material',
    canBeFound: 'Near grounded sparrows on warm days, shed naturally during preening.',
    seasonsAvailable: 'Spring & Summer (daytime only)',
    lore: 'A soft, unassuming sparrow feather — yet those versed in the old ways know that common things often carry quiet magic. The sparrow, being a creature of hearth and home, imbues its feathers with a gentle protective quality. They are best gathered from the ground where a bird has been resting, still carrying the warmth of its body. Feathers taken from a nest bring only ill luck.',
  },

  forest_mushroom: {
    itemId: 'forest_mushroom',
    latinName: 'Amanita silvestra',
    type: 'Mushroom',
    canBeFound: 'Beneath oak and birch trees in the procedural forest.',
    seasonsAvailable: 'Autumn only',
    lore: 'These cheerful red-capped toadstools with their distinctive white spots appear as if by magic when the first autumn mists roll through the forest. Despite their resemblance to the infamous fly agaric, this woodland variety is entirely safe — though one must know exactly what to look for. They are at their most potent when the cap is still slightly damp with morning dew, and they lose their magical efficacy rapidly once dried.',
  },

  frost_flower: {
    itemId: 'frost_flower',
    latinName: 'Crystallanthemum nivalis',
    type: 'Flower',
    canBeFound: 'Open ground during active snowfall — vanishes when the snow stops.',
    seasonsAvailable: 'Winter (during snowfall only)',
    lore: 'Perhaps the most elusive of all magical flora, the frost flower exists only while snow is falling. Its translucent petals form from crystallised moisture in the air, assembling themselves into an exquisite blossom that chimes softly in the wind. The petals are cold to the touch yet never melt, even held against warm skin. Herbalists debate whether it is truly a plant at all, or something closer to a spell given form.',
  },

  ghost_lichen: {
    itemId: 'ghost_lichen',
    latinName: 'Usnea phantasma',
    type: 'Lichen',
    canBeFound: 'Clinging to the bark of dead spruce trees in dark, sheltered groves.',
    seasonsAvailable: 'Year-round',
    lore: 'This pale, spectral growth thrives where other life has retreated, feeding on the lingering essence of fallen trees. In complete darkness it emits a faint, cold glow that country folk call the "corpse candle." Despite its unsettling reputation, ghost lichen has been used for centuries in remedies of preservation and protection. It is traditionally harvested during the waning moon, when practitioners claim its spectral properties are most concentrated.',
  },

  giant_mushroom_cap: {
    itemId: 'giant_mushroom_cap',
    latinName: 'Macrolepiota gigantea',
    type: 'Mushroom',
    canBeFound: 'The enormous mushrooms growing in the witch\'s glade.',
    seasonsAvailable: 'Year-round',
    lore: 'The towering mushrooms of the witch\'s glade grow to heights that defy all natural law, their caps broad enough to shelter beneath during a rainstorm. A single slice of the cap pulses with a deep, thrumming energy that speaks of growth unbounded. Old texts warn against consuming it raw — the magic within is too concentrated for the body to process without the tempering influence of a proper brewing. The mushrooms regenerate their caps slowly, and one must take care not to harvest too greedily.',
  },

  golden_apple: {
    itemId: 'golden_apple',
    latinName: 'Malus aurea faerialis',
    type: 'Fruit',
    canBeFound: 'A rare gift bestowed by the forest fairies to those who earn their trust.',
    seasonsAvailable: 'Special (fairy gift)',
    lore: 'Legends speak of orchards that exist between the folds of the world, where every tree bears fruit of living gold. The golden apple is not merely gilded but suffused with fairy magic from skin to core. A single fruit can elevate the quality of any potion to extraordinary heights. Those fortunate enough to receive one report that it hums faintly when held and smells of every season at once — spring blossoms, summer warmth, autumn harvest, and winter spice.',
  },

  hearthstone: {
    itemId: 'hearthstone',
    latinName: 'Lapis focaris',
    type: 'Mineral',
    canBeFound: 'A precious stone imbued with the essence of home — given only as a heartfelt gift.',
    seasonsAvailable: 'Special (gift from Mum)',
    lore: 'Not a gemstone in any mineralogical sense, the hearthstone is formed over years of love and warmth concentrated into physical form. It is always warm to the touch, and those who hold it report a profound sense of comfort and belonging. No two hearthstones are alike — each carries the character of the home that created it. They cannot be bought, sold, or stolen; a hearthstone given grudgingly crumbles to dust. In potion-making, it anchors volatile ingredients and prevents unwanted transformations.',
  },

  luminescent_toadstool: {
    itemId: 'luminescent_toadstool',
    latinName: 'Mycena lucerna',
    type: 'Mushroom',
    canBeFound: 'The darkest hollows of the mushroom forest, in clusters near rotting logs.',
    seasonsAvailable: 'Year-round',
    lore: 'These softly glowing cyan mushrooms illuminate the forest floor like fallen stars. Unlike bioluminescent fungi of the mundane world, their light never fades — even specimens centuries old continue to glow in museum collections. The luminescence is cool to the touch and casts no heat, making them prized as natural lanterns by those who venture into deep caves. In potions, they impart a steadying clarity that sharpens the mind and calms the nerves.',
  },

  mint: {
    itemId: 'mint',
    latinName: 'Mentha magica',
    type: 'Herb',
    canBeFound: 'The village shop stocks bunches of fresh mint year-round.',
    seasonsAvailable: 'Year-round (shop)',
    lore: 'Every cottage garden worth its salt grows a patch of mint, and with good reason — few herbs are so versatile in both kitchen and cauldron. The cooling sensation of mint is not merely a flavour but a genuine magical property: it calms overheated brews, prevents scorching, and soothes ingredients that resist combination. Experienced brewers say that adding mint to a troubled potion is like pouring cool water on a quarrel. It grows with such enthusiasm that the real challenge is stopping it from taking over entirely.',
  },

  moonpetal: {
    itemId: 'moonpetal',
    latinName: 'Lunaria noctiluca',
    type: 'Flower',
    canBeFound: 'Deep forest glades, opening its petals only under moonlight.',
    seasonsAvailable: 'Spring & Summer (night only)',
    lore: 'The moonpetal is the jewel of nocturnal herbalism — a luminous bloom that drinks in silver moonlight and transforms it into a soft, ethereal glow visible from paces away. Herbalists of old believed that moonpetals could reveal hidden truths, and garlands of the flower were hung in courts of law during important trials. The petals must be gathered at the peak of bloom with bare hands, for metal tools disrupt their delicate resonance. Even after pressing, a dried moonpetal will glow faintly on clear nights.',
  },

  morning_dew: {
    itemId: 'morning_dew',
    latinName: 'Ros matutinus',
    type: 'Essence',
    canBeFound: 'Any grassy area in the early hours of morning.',
    seasonsAvailable: 'Year-round (morning)',
    lore: 'Humble morning dew is the most common magical essence — so common, in fact, that many overlook it entirely. Yet every drop carries a trace of the night\'s dreaming, and dew gathered from a meadow where rabbits have been sleeping is said to carry particular sweetness. It serves as a universal base for simple potions, stretching more costly ingredients further. Novice witches learn to collect it first, crawling through the grass with small glass vials at an hour when sensible folk are still abed.',
  },

  mushroom: {
    itemId: 'mushroom',
    latinName: 'Boletus communis',
    type: 'Mushroom',
    canBeFound: 'Scattered throughout forest floors and shaded woodland areas.',
    seasonsAvailable: 'Year-round',
    lore: 'The common forest mushroom may lack the glamour of its luminescent or giant cousins, but it remains a staple of practical magic. Its earthy flavour anchors flighty ingredients and provides body to thin potions — much as a good stock thickens a soup. Experienced brewers keep a dried supply at all times, knowing that inspiration for a new potion often strikes without warning. The best specimens grow in rings, which country folk call fairy circles, though the fairies themselves seem indifferent to the association.',
  },

  phoenix_ash: {
    itemId: 'phoenix_ash',
    latinName: 'Cinis phoenicis',
    type: 'Essence',
    canBeFound: 'The witch\'s shop stocks small quantities at considerable price.',
    seasonsAvailable: 'Year-round (shop only)',
    lore: 'True phoenix ash — not the common hearth variety sold by charlatans — glitters with an inner fire that never cools. A pinch held in the palm will warm the hand for hours. It is the residue of a phoenix feather\'s natural renewal cycle, gathered painstakingly from nesting sites in volcanic regions far from here. In potions, phoenix ash provides the spark of transformation, turning base mixtures into something remarkable. It is the most expensive staple in a witch\'s inventory, and no amount of cleverness can substitute for it.',
  },

  sakura_petal: {
    itemId: 'sakura_petal',
    latinName: 'Prunus mystica',
    type: 'Flower',
    canBeFound: 'Beneath cherry trees during the brief spring blossom season.',
    seasonsAvailable: 'Spring only',
    lore: 'The cherry blossom season lasts mere days — a beautiful, melancholy reminder of how fleeting precious things can be. A perfect sakura petal, caught before it touches the ground, carries the essence of that transience. In potion-making, it lends a quality of grace and gentleness that smooths harsh effects. The petals must be caught mid-fall, for those that have landed are merely pretty. Patient gatherers stand beneath the trees for hours, hands cupped, waiting for the breeze to deliver its gift.',
  },

  shadow_essence: {
    itemId: 'shadow_essence',
    latinName: 'Essentia umbrae',
    type: 'Essence',
    canBeFound: 'Pools of deep shadow in places where light has never reached.',
    seasonsAvailable: 'Year-round',
    lore: 'A wisp of pure darkness captured in a glass vial — shadow essence is unsettling to hold, as it seems to absorb the light around it and weighs nothing at all. It is not evil, despite appearances; shadow is merely the absence of light, and in potion-making it serves to diminish, conceal, and quieten. A drop in an invisibility potion makes the drinker harder to notice; a drop in a sleeping draught deepens the rest. The challenge lies entirely in the gathering, for one must find shadows so deep that they have substance.',
  },

  shrinking_violet: {
    itemId: 'shrinking_violet',
    latinName: 'Viola diminuens',
    type: 'Flower',
    canBeFound: 'Sheltered forest clearings in spring, or from the witch\'s shop.',
    seasonsAvailable: 'Spring only',
    lore: 'True to its name, this tiny purple flower seems to shrink away from direct observation — turn your gaze upon it and its petals fold inward, as though embarrassed to be seen. This sympathetic magic makes it essential for size-altering potions, particularly those of reduction. The flower contains a concentrated essence of smallness that, when properly extracted, can compress matter without destroying it. Wild specimens are notoriously difficult to spot, as they hide behind larger plants and duck beneath leaves at the first sign of attention.',
  },

  temporal_dust: {
    itemId: 'temporal_dust',
    latinName: 'Pulvis temporis',
    type: 'Essence',
    canBeFound: 'Exceedingly rare — only the witch\'s shop carries small quantities.',
    seasonsAvailable: 'Year-round (shop only)',
    lore: 'This shimmering dust exists slightly out of step with the present moment, flickering between what was and what will be. Holding a vial of temporal dust produces an odd sensation of déjà vu, as though you have held it before and will hold it again. Its origins are disputed — some say it accumulates naturally where time flows unevenly, others believe it is manufactured by beings who dwell outside time altogether. In brewing, it is the key ingredient for any potion that meddles with time\'s passage, and it commands an extraordinary price.',
  },

  vinegar: {
    itemId: 'vinegar',
    latinName: 'Acetum mysticum',
    type: 'Herb',
    canBeFound: 'The village shop keeps a reliable supply.',
    seasonsAvailable: 'Year-round (shop)',
    lore: 'Plain vinegar may seem an unlikely magical ingredient, yet its sharp, acidic nature serves a vital purpose in the cauldron. It cuts through magical residue, cleanses impurities from other ingredients, and provides the necessary tartness to balance overly sweet or cloying potions. Experienced witches know that a splash of good vinegar can rescue a potion that has gone slightly wrong — it strips away the error and allows you to begin the final steps afresh. Always keep a bottle within arm\'s reach of the cauldron.',
  },

  wolfsbane: {
    itemId: 'wolfsbane',
    latinName: 'Aconitum luparia',
    type: 'Flower',
    canBeFound: 'Rocky hillsides and forest edges, or from the witch\'s shop. Handle with care.',
    seasonsAvailable: 'Spring, Summer & Autumn (dormant in winter)',
    lore: 'The purple-hooded wolfsbane is as beautiful as it is dangerous — every part of the plant is toxic to the touch, and only a fool handles it without gloves. Its name derives from the old practice of using it to ward off wolves, though modern herbalists value it primarily for its powerful protective properties. In carefully measured doses, wolfsbane strengthens shielding potions and wards against malign influences. The key word is "carefully" — too much, and the cure becomes the poison. It has been used in folk remedies since antiquity, always with the greatest respect.',
  },
};

/**
 * All encyclopaedia entries sorted alphabetically by display name.
 */
export const ENCYCLOPAEDIA_ENTRIES: EncyclopaediaEntry[] = Object.values(ENCYCLOPAEDIA_DATA)
  .sort((a, b) => {
    const nameA = getItem(a.itemId)?.displayName ?? a.itemId;
    const nameB = getItem(b.itemId)?.displayName ?? b.itemId;
    return nameA.localeCompare(nameB);
  });

/**
 * Get an encyclopaedia entry by item ID.
 */
export function getEncyclopaediaEntry(itemId: string): EncyclopaediaEntry | undefined {
  return ENCYCLOPAEDIA_DATA[itemId];
}
