/** Read-only guidance: these functions never spend items or grant quest credit. */
export interface QuestNextStep {
  action: string;
  where: string;
  details: string[];
}
export interface CookingGuideState {
  teaComplete: boolean;
  recipes: Array<{ name: string; timesCooked: number; mastered: boolean; missing: string[] }>;
}
export function cookingNextStep(state: CookingGuideState): QuestNextStep {
  if (!state.teaComplete)
    return {
      action: 'Make your first tea',
      where: 'Mum’s kitchen',
      details: [
        'Open your recipe book, choose Tea, then Cook. You can also use Make Tea at the Fireplace.',
        'Mum supplies missing ingredients for one practice cup after you ask her to teach you. The tea goes into your bag.',
      ],
    };
  const recipe = state.recipes.find((r) => !r.mastered);
  if (!recipe)
    return {
      action: 'Ask Mum for your next recipe',
      where: 'Mum’s kitchen',
      details: [
        'Ask Mum to teach you to cook. Choose a cooking path, or continue your current one.',
        'You keep your cooking progress while helping other neighbours.',
      ],
    };
  return {
    action: recipe.missing.length ? `Gather ingredients for ${recipe.name}` : `Cook ${recipe.name}`,
    where: 'Recipe book → All Recipes',
    details: [
      `${recipe.name}: ${recipe.timesCooked}/3 successful cooks towards mastery.`,
      ...(recipe.missing.length
        ? [`Still needed for one cook: ${recipe.missing.join(', ')}.`]
        : ['You have the ingredients for one cook.']),
      'Return to Mum for the next recipe after mastering this one. Other learned recipes are still available in your book.',
    ],
  };
}
export interface GardenGuideState {
  offered: boolean;
  season: string;
  task: 'spring' | 'summer' | 'autumn' | null;
  completed: string[];
  cropCount: number;
  honeyCount: number;
}
export function gardeningNextStep(s: GardenGuideState): QuestNextStep {
  const progress = `Seasons finished: ${s.completed.length}/3${s.completed.length ? ` (${s.completed.join(', ')})` : ''}.`;
  if (s.offered)
    return {
      action: 'Accept Elias’s gardening offer',
      where: 'Elias in the village',
      details: ['Ask about helping with the garden whenever you are ready.'],
    };
  if (s.task && !s.completed.includes(s.task)) {
    const honey = s.task === 'autumn';
    const count = honey ? s.honeyCount : s.cropCount;
    return {
      action:
        count > 0
          ? `Deliver ${honey ? '1 Honey' : '1 crop'} to Elias`
          : honey
            ? 'Find honey for Elias'
            : 'Grow a crop for Elias',
      where:
        count > 0
          ? 'Elias in the village'
          : honey
            ? 'Ask Elias about the autumn task'
            : 'The village garden',
      details: [
        progress,
        `${s.task} delivery: ${Math.min(count, 1)}/1 ${honey ? 'Honey' : 'crop'} in your bag.`,
        count > 0
          ? 'Speak to Elias and choose the crop delivery response. Carrying the item alone does not finish the task.'
          : honey
            ? 'Elias can explain where to get honey. Bring it back through his gardening dialogue.'
            : 'Plant seeds in tilled soil, water them and harvest when ready. Elias accepts one crop from your bag.',
        ...(s.task !== s.season
          ? [
              `Your ${s.task} task is still active. You can deliver an item already in your bag even though it is now ${s.season}.`,
            ]
          : []),
      ],
    };
  }
  if (s.season === 'winter' || s.completed.includes(s.season))
    return {
      action: 'Try another activity while the seasons turn',
      where: 'Journal → Things to try',
      details: [
        progress,
        s.season === 'winter'
          ? 'Elias has no new winter task. Return in an unfinished growing season.'
          : `You have finished ${s.season}. Return to Elias in an unfinished season.`,
        'Your completed seasonal tasks stay saved.',
      ],
    };
  return {
    action: 'Ask Elias for this season’s task',
    where: 'Elias in the village',
    details: [
      progress,
      `It is ${s.season}. Ask how the garden is coming along to get your next task. Seeds are given once per season’s task.`,
    ],
  };
}
export interface ChoresGuideState {
  done: boolean;
  cobwebsRemaining: number;
  teaDelivered: boolean;
  cookiesDelivered: boolean;
  teaCount: number;
  cookiesCount: number;
  cookiesUnlocked: boolean;
}
export function altheaNextStep(s: ChoresGuideState): QuestNextStep {
  const details = [
    `Cobwebs cleaned: ${5 - s.cobwebsRemaining}/5.`,
    s.teaDelivered
      ? 'Tea: delivered.'
      : `Tea: ${Math.min(s.teaCount, 1)}/1 in your bag; not yet delivered.`,
    s.cookiesDelivered
      ? 'Cookies: delivered.'
      : `Cookies: ${Math.min(s.cookiesCount, 1)}/1 in your bag; not yet delivered.`,
  ];
  if (s.done)
    return {
      action: 'Return to Althea to hear her story',
      where: 'Althea’s cottage in the village',
      details,
    };
  if ((!s.teaDelivered && s.teaCount > 0) || (!s.cookiesDelivered && s.cookiesCount > 0))
    return {
      action: `Give Althea your ${!s.teaDelivered && s.teaCount > 0 ? 'tea' : 'cookies'}`,
      where: 'Althea’s cottage in the village',
      details: [
        ...details,
        'Use her chores dialogue to hand it over, or give her the requested item. Carrying it alone does not finish the chore.',
      ],
    };
  if (s.cobwebsRemaining > 0)
    return {
      action: 'Dust Althea’s cobwebs',
      where: 'Inside Althea’s cottage',
      details: [
        ...details,
        'Equip the feather duster Althea gave you, then select a cobweb. You can bring the food before or after cleaning.',
      ],
    };
  if (!s.teaDelivered)
    return { action: 'Make tea for Althea', where: 'Mum’s kitchen → Recipe book → Tea', details };
  return {
    action: s.cookiesUnlocked ? 'Bake cookies for Althea' : 'Ask Mum about learning cookies',
    where: s.cookiesUnlocked ? 'Recipe book → Baking' : 'Mum’s kitchen',
    details: [
      ...details,
      s.cookiesUnlocked
        ? 'Choose Chocolate Cookies, gather the listed ingredients and cook. Bring one back to Althea.'
        : 'Cookies are on Mum’s baking path. If you have another cooking path in progress, finish that path before switching to baking. You can keep other quests active meanwhile.',
    ],
  };
}
