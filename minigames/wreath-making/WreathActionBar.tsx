/**
 * Wreath Making mini-game — compact sticky action bar: Clear · Close · Create Wreath.
 *
 * Plain `onClick` only. The desktop buttons also listen for `touchend`, which on
 * a phone fires at the end of a scroll that merely started on a button; for
 * Create Wreath, the one action that spends materials, that is not acceptable.
 */

import React from 'react';
import { MIN_TOUCH_TARGET } from './wreathLayout';

interface WreathActionBarProps {
  canCreate: boolean;
  canClear: boolean;
  isCreating: boolean;
  onClear: () => void;
  onClose: () => void;
  onCreate: () => void;
}

const base: React.CSSProperties = {
  minHeight: MIN_TOUCH_TARGET + 4,
  padding: '0 14px',
  borderRadius: 12,
  fontSize: 15,
  cursor: 'pointer',
  touchAction: 'manipulation',
};

export const WreathActionBar: React.FC<WreathActionBarProps> = ({
  canCreate,
  canClear,
  isCreating,
  onClear,
  onClose,
  onCreate,
}) => {
  const createEnabled = canCreate && !isCreating;
  const clearEnabled = canClear && !isCreating;
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        background: '#1a2e1a',
        borderTop: '1px solid #3a5a2a',
      }}
    >
      <button
        onClick={onClear}
        disabled={!clearEnabled}
        style={{
          ...base,
          background: '#2a3a22',
          border: '2px solid #3a5a2a',
          color: clearEnabled ? '#c8d4b8' : '#5a6a4a',
          opacity: clearEnabled ? 1 : 0.6,
        }}
      >
        Clear
      </button>
      <button
        onClick={onClose}
        disabled={isCreating}
        style={{
          ...base,
          background: '#2a3a22',
          border: '2px solid #3a5a2a',
          color: '#c8d4b8',
        }}
      >
        Close
      </button>
      <button
        onClick={onCreate}
        disabled={!createEnabled}
        style={{
          ...base,
          flex: 1,
          fontWeight: 'bold',
          background: createEnabled ? '#4a6a3a' : '#2a3a22',
          border: `2px solid ${createEnabled ? '#86b86e' : '#3a5a2a'}`,
          color: createEnabled ? '#f0f8e8' : '#5a6a4a',
          opacity: createEnabled ? 1 : 0.7,
        }}
      >
        {isCreating ? 'Creating…' : 'Create Wreath'}
      </button>
    </div>
  );
};
