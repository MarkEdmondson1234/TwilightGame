import React from 'react';
import MobileMenuShell from './MobileMenuShell';
import { Z_HELP_BROWSER, zClass } from '../zIndex';

export default function PortraitPlayPrompt({
  onOpenAccount,
  onOpenHelp,
}: {
  onOpenAccount: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <MobileMenuShell className={`bg-black/70 ${zClass(Z_HELP_BROWSER)}`}>
      <section
        role="dialog"
        aria-labelledby="rotate-title"
        className="w-full max-w-sm max-h-full overflow-y-auto rounded-lg border-4 border-[#8b7355] bg-[#f5f0e1] p-6 text-center text-[#3d2e1f] font-serif"
      >
        <h1 id="rotate-title" className="text-2xl font-bold mb-4">
          Turn your phone to play
        </h1>
        <p className="mb-6">
          Clover Village plays in landscape. Your progress stays here while you turn your phone.
        </p>
        <button
          onClick={onOpenAccount}
          className="w-full min-h-12 mb-3 rounded border-2 border-[#8b7355] bg-[#e8dcc8] font-semibold"
        >
          Account / Multiplayer
        </button>
        <button
          onClick={onOpenHelp}
          className="w-full min-h-12 rounded border-2 border-[#8b7355] bg-[#e8dcc8] font-semibold"
        >
          Settings &amp; Help
        </button>
      </section>
    </MobileMenuShell>
  );
}
