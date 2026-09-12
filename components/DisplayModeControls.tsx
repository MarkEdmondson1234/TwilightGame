import React, { useEffect, useState } from 'react';

/** Browser fullscreen is optional; gameplay never depends on the request succeeding. */
export default function DisplayModeControls() {
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState('');
  const supported = typeof document !== 'undefined' && document.fullscreenEnabled;
  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    update();
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const toggle = async () => {
    setMessage('');
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (mode: string) => Promise<void>;
        };
        try {
          await orientation?.lock?.('landscape');
        } catch {
          /* The rotation prompt remains available. */
        }
      }
    } catch {
      setMessage('Fullscreen is unavailable here. You can keep playing in the browser.');
    }
  };
  return (
    <div className="mt-4">
      {supported ? (
        <button
          onClick={() => void toggle()}
          className="min-h-12 px-4 rounded border-2 border-[#8b7355] bg-[#e8dcc8]"
        >
          {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        </button>
      ) : (
        <p className="text-sm">
          On iPhone, open the game in Safari and choose Share → Add to Home Screen, then launch its
          icon to play without browser bars.
        </p>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
