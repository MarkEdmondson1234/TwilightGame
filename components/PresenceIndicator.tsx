/**
 * PresenceIndicator — "2 friends here".
 *
 * Small enough to ignore and useful enough to glance at: it tells you whether
 * anyone else is in this map before you have spotted them behind a tree.
 * Renders nothing at all when you are alone, so single-player is untouched.
 */

import React from 'react';
import { Z_PRESENCE_INDICATOR, zClass } from '../zIndex';

interface PresenceIndicatorProps {
  count: number;
  names: string[];
  /** Smaller layout for short screens */
  compact?: boolean;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ count, names, compact = false }) => {
  if (count <= 0) return null;

  const label = count === 1 ? '1 friend here' : `${count} friends here`;

  return (
    <div
      className={`pointer-events-none fixed left-1/2 -translate-x-1/2 ${zClass(Z_PRESENCE_INDICATOR)}`}
      style={{ top: compact ? '8px' : '14px' }}
      title={names.join(', ')}
    >
      <div
        className={`flex items-center gap-1.5 rounded-full border border-amber-200/50 bg-stone-800/75 text-amber-50 shadow-md ${
          compact ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        }`}
      >
        <span aria-hidden="true">🧑‍🤝‍🧑</span>
        <span>{label}</span>
      </div>
    </div>
  );
};

export default PresenceIndicator;
