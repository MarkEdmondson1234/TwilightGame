/**
 * SplashScreen - Title screen shown before the game starts loading.
 *
 * Purely presentational: a season-appropriate scenic backdrop (reusing the
 * existing cutscene art, composited statically — see utils/splashScenes.ts),
 * the game's name, and a Play button. Also offers Help (opens the in-game F1 documentation
 * browser) as a self-contained overlay, so this component has no dependency
 * on the rest of App.tsx's UI state machine — it can render at the very top
 * of the component tree, before map/asset loading has even started.
 */

import React, { useEffect, useState } from 'react';
import HelpBrowser from './HelpBrowser';
import { TimeManager, Season } from '../utils/TimeManager';
import { audioManager } from '../utils/AudioManager';
import { CUTSCENE_DIR, SEASON_SCENES } from '../utils/splashScenes';
import { Z_SPLASH_SCREEN, zClass } from '../zIndex';

interface SplashScreenProps {
  onPlay: () => void;
}

// Reuses the same village theme (and seasonal variants) the village map
// itself plays — there's no dedicated title track yet, but this is the
// game's most "peaceful home base" music, which fits a title screen well.
// Every key here is always loaded by gameInitializer's audioAssets batch, so
// no readiness check is needed: playMusic() queues and auto-starts once the
// batch finishes loading, same as the ambient sound calls elsewhere.
const SEASON_MUSIC: Record<Season, string> = {
  [Season.SPRING]: 'music_village',
  [Season.SUMMER]: 'music_village_summer',
  [Season.AUTUMN]: 'music_village_autumn',
  [Season.WINTER]: 'music_village_winter',
};

const TITLE_FONT = 'Georgia, "Times New Roman", serif';

const SplashScreen: React.FC<SplashScreenProps> = ({ onPlay }) => {
  const [showHelp, setShowHelp] = useState(false);

  // Read the season fresh on each mount rather than memoising — the splash
  // only mounts once per page load, so there's no benefit to memoising and
  // it always reflects "right now" if the player reloads later in the day.
  const season = TimeManager.getCurrentTime().season;
  const layers = SEASON_SCENES[season] ?? SEASON_SCENES[Season.SPRING];

  // Music plays for as long as the splash (title card + Help) is mounted,
  // and fades out once the player presses Play — the in-game ambient music
  // system (useEnvironmentController) runs on its own random schedule rather
  // than looping continuously, so there's no guarantee anything else fades
  // in to cover an abrupt stop.
  useEffect(() => {
    audioManager.playMusic(SEASON_MUSIC[season] ?? 'music_village', { fadeIn: 1500 });
    return () => {
      audioManager.stopMusic(800);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play once per mount, not on season re-reads
  }, []);

  // Wrapped in its own fixed, high-z-index root: this renders alongside the
  // game underneath (which keeps loading/initialising the whole time — see
  // App.tsx), not in place of it, so it must out-rank every other overlay
  // (including the black loading screen underneath it) to stay on top. Its
  // z-index value must also be listed in the safelist in src/styles/global.css
  // — Tailwind never generates a class zClass() only builds at runtime.
  // The wrapper also gives HelpBrowser (rendered inside it, below, at
  // its own normal z-index) a fresh local stacking context, so it isn't
  // compared against the game's z-indexed overlays directly.
  return (
    <div className={`fixed inset-0 ${zClass(Z_SPLASH_SCREEN)}`}>
      {showHelp ? (
        <HelpBrowser onClose={() => setShowHelp(false)} />
      ) : (
        <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-end select-none">
          {/* Composited seasonal scene — each layer full-viewport, bottom to top */}
          {layers.map((layer) => (
            <div
              key={layer.image}
              className="absolute inset-0 bg-center"
              style={{
                backgroundImage: `url(${CUTSCENE_DIR}${layer.image})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                zIndex: layer.zIndex,
              }}
            />
          ))}

          {/* Bottom gradient so the title/buttons stay legible over any background.
              Above every backdrop layer (max zIndex 3), below the title (z-10). */}
          <div
            className="absolute inset-0"
            style={{
              zIndex: 4,
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
              Clover Village
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
      )}
    </div>
  );
};

export default SplashScreen;
