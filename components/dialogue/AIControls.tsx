/**
 * AIControls - AI dialogue suggestion buttons and custom input
 *
 * Renders AI-generated suggestion buttons, a custom text input,
 * and mode-switch / close links — all inside the dialogue frame.
 */

import React, { useRef, useEffect } from 'react';
import { DIALOGUE_FONT, TEXT_FONT } from './dialogueHelpers';

interface AIControlsProps {
  suggestions: string[];
  isLoading: boolean;
  isStreaming: boolean;
  showCustomInput: boolean;
  inputText: string;
  pendingSendToBed: boolean;
  onSendMessage: (message: string) => void;
  onToggleCustomInput: (show: boolean) => void;
  onInputChange: (text: string) => void;
  onSwitchToScripted: () => void;
  onClose: () => void;
}

const AIControls: React.FC<AIControlsProps> = ({
  suggestions,
  isLoading,
  isStreaming,
  showCustomInput,
  inputText,
  pendingSendToBed,
  onSendMessage,
  onToggleCustomInput,
  onInputChange,
  onSwitchToScripted,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = isLoading || isStreaming;

  useEffect(() => {
    if (showCustomInput) inputRef.current?.focus();
  }, [showCustomInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(inputText);
    }
    if (e.key === 'Escape') {
      if (showCustomInput) onToggleCustomInput(false);
      else onClose();
    }
  };

  return (
    <div className="flex-shrink-0" style={{ padding: '6px 6% 8px' }}>
      {/* Suggestion buttons */}
      {!showCustomInput && !busy && !pendingSendToBed && suggestions.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 justify-center mb-1.5 overflow-y-auto"
          style={{ maxHeight: '56px' }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSendMessage(suggestion)}
              className="px-3 py-1 text-xs transition-all duration-200 ease-out transform hover:scale-105 active:scale-95"
              style={{
                fontFamily: DIALOGUE_FONT,
                background:
                  'linear-gradient(180deg, rgba(139, 90, 43, 0.85) 0%, rgba(101, 67, 33, 0.95) 100%)',
                color: '#faebd7',
                border: '1.5px solid rgba(210, 160, 90, 0.7)',
                borderRadius: '6px',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(180deg, rgba(160, 110, 55, 0.9) 0%, rgba(120, 80, 40, 0.95) 100%)';
                e.currentTarget.style.borderColor = 'rgba(230, 180, 100, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(180deg, rgba(139, 90, 43, 0.85) 0%, rgba(101, 67, 33, 0.95) 100%)';
                e.currentTarget.style.borderColor = 'rgba(210, 160, 90, 0.7)';
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Custom input */}
      {showCustomInput ? (
        <div className="flex gap-2 justify-center">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Speak your mind..."
            className="flex-1 max-w-md px-3 py-1.5 text-sm focus:outline-none"
            style={{
              fontFamily: DIALOGUE_FONT,
              background: 'rgba(45, 35, 25, 0.9)',
              color: '#faebd7',
              border: '1.5px solid rgba(180, 130, 70, 0.6)',
              borderRadius: '6px',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
            disabled={busy}
          />
          <button
            onClick={() => onSendMessage(inputText)}
            disabled={busy || !inputText.trim()}
            className="px-3 py-1.5 text-sm transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none"
            style={{
              fontFamily: DIALOGUE_FONT,
              background:
                'linear-gradient(180deg, rgba(76, 120, 76, 0.9) 0%, rgba(50, 90, 50, 0.95) 100%)',
              color: '#e8f5e8',
              border: '1.5px solid rgba(140, 180, 120, 0.7)',
              borderRadius: '6px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            Send
          </button>
          <button
            onClick={() => onToggleCustomInput(false)}
            className="px-3 py-1.5 text-sm transition-all duration-200 transform hover:scale-105 active:scale-95"
            style={{
              fontFamily: DIALOGUE_FONT,
              background:
                'linear-gradient(180deg, rgba(80, 70, 60, 0.85) 0%, rgba(60, 50, 40, 0.95) 100%)',
              color: '#d4c4b4',
              border: '1.5px solid rgba(140, 120, 100, 0.6)',
              borderRadius: '6px',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        !pendingSendToBed && (
          <div className="flex gap-3 justify-center items-center">
            <button
              onClick={() => onToggleCustomInput(true)}
              className="text-xs px-3 py-1 transition-all duration-200 transform hover:scale-105"
              style={{
                fontFamily: DIALOGUE_FONT,
                background: 'rgba(60, 50, 40, 0.7)',
                color: '#d4a373',
                border: '1px solid rgba(180, 140, 90, 0.5)',
                borderRadius: '6px',
              }}
              disabled={busy}
            >
              Ask something else...
            </button>
            <button
              onClick={onSwitchToScripted}
              className="text-xs transition-colors duration-200"
              style={{ fontFamily: DIALOGUE_FONT, color: 'rgba(180, 160, 140, 0.8)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#d4a373')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180, 160, 140, 0.8)')}
            >
              ← Return to conversation
            </button>
            <button
              onClick={onClose}
              className="text-xs transition-colors duration-200"
              style={{ fontFamily: DIALOGUE_FONT, color: 'rgba(180, 160, 140, 0.8)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#d4a373')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180, 160, 140, 0.8)')}
            >
              Farewell
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default AIControls;
