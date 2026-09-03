/**
 * ConfirmMiniGameModal - generic Yes/No prompt shown before launching a mini-game
 * whose definition sets `confirmMessage` (see minigames/types.ts).
 *
 * Currently only used by the `mapLocation` trigger provider
 * (utils/interactions/providers/mapLocation.ts), for entrances like the
 * Wizard Trials door, where auto-launching on a single click would be surprising.
 */

import React from 'react';
import { Z_MODAL, zClass } from '../zIndex';

interface ConfirmMiniGameModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmMiniGameModal: React.FC<ConfirmMiniGameModalProps> = ({
  message,
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      className={`fixed inset-0 bg-black/80 flex items-center justify-center ${zClass(Z_MODAL)} pointer-events-auto`}
      onClick={onCancel}
    >
      <div
        className="bg-gradient-to-b from-indigo-900 to-indigo-950 border-4 border-indigo-500 rounded-lg p-8 max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-indigo-100 text-lg mb-6">{message}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 font-bold rounded-lg transition-colors"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg transition-colors"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmMiniGameModal;
