/**
 * SplashScreen - Title screen shown before the game starts loading.
 *
 * Purely presentational: a season-appropriate scenic backdrop (reusing the
 * existing cutscene background art, not new assets), the game's name, and
 * a Play button. Also offers Help (opens the in-game F1 documentation
 * browser) as a self-contained overlay, so this component has no dependency
 * on the rest of App.tsx's UI state machine — it can render at the very top
 * of the component tree, before map/asset loading has even started.
 */

import React, { useState } from 'react';
import HelpBrowser from './HelpBrowser';
import { TimeManager, Season } from '../utils/TimeManager';

interface SplashScreenProps {
  onPlay: () => void;
}

const SEASON_BACKGROUNDS: Record<Season, string> = {
  [Season.SPRING]: 'cutscene_spring_background.png',
  [Season.SUMMER]: 'cutscene_summer_background.png',
  [Season.AUTUMN]: 'cutscene_autumn_background.png',
  [Season.WINTER]: 'cutscene_winter_background.png',
};

const TITLE_FONT = 'Georgia, "Times New Roman", serif';

const SplashScreen: React.FC<SplashScreenProps> = ({ onPlay }) => {
  const [showHelp, setShowHelp] = useState(false);

  // Read the season fresh on each mount rather than memoising — the splash
  // only mounts once per page load, so there's no benefit to memoising and
  // it always reflects "right now" if the player reloads later in the day.
  const season = TimeManager.getCurrentTime().season;
  const backgroundFile = SEASON_BACKGROUNDS[season] ?? SEASON_BACKGROUNDS[Season.SPRING];
  const backgroundUrl = `/TwilightGame/assets-optimized/cutscenes/${backgroundFile}`;

  if (showHelp) {
    return <HelpBrowser onClose={() => setShowHelp(false)} />;
  }

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-col items-center justify-end select-none"
      style={{
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Bottom gradient so the title/buttons stay legible over any background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(20,15,10,0) 40%, rgba(20,15,10,0.55) 75%, rgba(20,15,10,0.85) 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-2 pb-6">
        <h1
          className="text-6xl sm:text-7xl font-bold text-amber-50 tracking-wide"
          style={{
            fontFamily: TITLE_FONT,
            textShadow: '0 3px 12px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          Twilight Village
        </h1>
        <p
          className="text-base sm:text-lg text-amber-100/90 mb-4"
          style={{ fontFamily: TITLE_FONT, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
        >
          A peaceful place where time flows gently with the seasons
        </p>

        <button
          onClick={onPlay}
          className="px-10 py-3 text-lg text-amber-100 bg-amber-800/70 border border-amber-600/60 rounded-lg
            hover:bg-amber-700/80 hover:border-amber-500/70 transition-all duration-300
            animate-pulse hover:animate-none cursor-pointer shadow-lg"
          style={{ fontFamily: TITLE_FONT }}
        >
          Play
        </button>

        <button
          onClick={() => setShowHelp(true)}
          className="mt-3 text-sm text-amber-100/70 hover:text-amber-100 transition-colors duration-200 cursor-pointer underline underline-offset-4"
          style={{ fontFamily: TITLE_FONT }}
        >
          Help
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;
