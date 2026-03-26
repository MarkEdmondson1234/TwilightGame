/**
 * YuleTimer
 *
 * Displays a 10-minute countdown banner at the top of the screen
 * during the Yule gift-giving celebration.
 */

import React, { useState, useEffect } from 'react';
import { yuleCelebrationManager } from '../utils/YuleCelebrationManager';
import { Z_HUD, zClass } from '../zIndex';

interface YuleTimerProps {
  isActive: boolean;
}

const YuleTimer: React.FC<YuleTimerProps> = ({ isActive }) => {
  const [timeStr, setTimeStr] = useState('10:00');

  useEffect(() => {
    if (!isActive) return;
    // Update every second
    const id = setInterval(() => {
      setTimeStr(yuleCelebrationManager.getFormattedTimeRemaining());
    }, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  if (!isActive) return null;

  const remainingMs = yuleCelebrationManager.getRemainingMs();
  const isUrgent = remainingMs < 60_000; // last minute — turn red

  return (
    <div
      className={zClass(Z_HUD)}
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: isUrgent ? 'rgba(180, 40, 40, 0.92)' : 'rgba(34, 60, 34, 0.92)',
        color: '#f5f0e8',
        fontFamily: '"Georgia", "Times New Roman", serif',
        fontSize: '1rem',
        fontWeight: 'bold',
        padding: '6px 20px',
        borderRadius: 8,
        border: `1px solid ${isUrgent ? '#e88' : '#7a9e7a'}`,
        letterSpacing: '0.04em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      🎄 Yule Gift Giving: {timeStr}
    </div>
  );
};

export default YuleTimer;
