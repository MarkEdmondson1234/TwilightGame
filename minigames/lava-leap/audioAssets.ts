import type { AudioAssetConfig } from '../../utils/AudioManager';

export const lavaLeapAudioAssets: Record<string, AudioAssetConfig> = Object.fromEntries(
  [
    'warning',
    'eruption',
    'frost',
    'wind',
    'earth',
    'treasure',
    'haven',
    'rescue',
    'jump',
    'land',
    'finish',
  ].map((name) => [
    `sfx_lava_${name}`,
    {
      url: `/TwilightGame/assets/audio/sfx/lava-leap/${name}.wav`,
      category: 'sfx',
      volume: name === 'eruption' ? 0.55 : 0.7,
    },
  ])
);
