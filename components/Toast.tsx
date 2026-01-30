import React, { useState, useEffect, useCallback } from 'react';
import { Z_TOAST, zClass } from '../zIndex';
import { TILE_SIZE } from '../constants';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: number) => void;
  /** Player screen X position (pixels) */
  playerScreenX?: number;
  /** Player screen Y position (pixels) */
  playerScreenY?: number;
}

/**
 * Toast notification component for showing temporary feedback messages
 * Messages appear above the player with a cottage-core aesthetic
 * Messages auto-dismiss after 3 seconds
 */
const Toast: React.FC<ToastProps> = ({ messages, onDismiss, playerScreenX, playerScreenY }) => {
  useEffect(() => {
    // Auto-dismiss messages after 3 seconds
    const timers = messages.map((msg) => {
      return setTimeout(() => {
        onDismiss(msg.id);
      }, 3000);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [messages, onDismiss]);

  if (messages.length === 0) return null;

  // Cottage-core styled colors - soft, warm, earthy tones
  const getStyles = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-[#4a6741]/95 border-[#7a9970] text-[#e8f0e4]'; // Sage green
      case 'warning':
        return 'bg-[#8b6914]/95 border-[#c4a035] text-[#fff8e1]'; // Honey gold
      case 'error':
        return 'bg-[#7d4040]/95 border-[#a05555] text-[#fce8e8]'; // Dusty rose
      default:
        return 'bg-[#5c4a3d]/95 border-[#8b7355] text-[#f5efe8]'; // Warm brown
    }
  };

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return '🌿';
      case 'warning':
        return '🌻';
      case 'error':
        return '🥀';
      default:
        return '🌾';
    }
  };

  // If player position provided, show above player; otherwise show at bottom center
  const usePlayerPosition = playerScreenX !== undefined && playerScreenY !== undefined;

  return (
    <div
      className={`${zClass(Z_TOAST)} flex flex-col-reverse gap-2 pointer-events-none`}
      style={
        usePlayerPosition
          ? {
              position: 'absolute',
              left: playerScreenX,
              top: playerScreenY - TILE_SIZE - 20, // Above the player
              transform: 'translateX(-50%)',
            }
          : {
              position: 'fixed',
              bottom: '5rem',
              left: '50%',
              transform: 'translateX(-50%)',
            }
      }
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`px-4 py-2 rounded-xl border-2 shadow-lg ${getStyles(msg.type)}`}
          style={{
            animation: 'toast-float-up 0.4s ease-out',
            fontFamily: '"Georgia", "Times New Roman", serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <span className="mr-2">{getIcon(msg.type)}</span>
          <span className="text-sm font-medium italic">{msg.message}</span>
        </div>
      ))}
      <style>{`
                @keyframes toast-float-up {
                    from { opacity: 0; transform: translateY(15px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
    </div>
  );
};

/**
 * Hook for managing toast messages
 */
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const idCounter = React.useRef(0);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    setMessages((prev) => {
      // Don't add duplicate if same message already visible
      if (prev.some((msg) => msg.message === message)) {
        return prev;
      }
      const id = idCounter.current++;
      return [...prev, { id, message, type }];
    });
  }, []);

  const dismissToast = useCallback((id: number) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  return { messages, showToast, dismissToast };
}

export default Toast;
