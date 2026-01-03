import React, { useState } from 'react';
import { GameTime, TimeOfDay } from '../utils/TimeManager';

interface AnalogClockProps {
  currentTime: GameTime;
  size?: number;
}

/**
 * AnalogClock - A rustic cottagecore clock with rotating hands
 *
 * Design:
 * - Warm parchment/brass aesthetic
 * - Hour and minute hands that rotate smoothly
 * - Roman numerals for hour markers
 * - Decorative brass rim
 */
const AnalogClock: React.FC<AnalogClockProps> = ({ currentTime, size = 80 }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const center = size / 2;
  const faceRadius = (size / 2) - 6;

  // Calculate hand angles
  // Hour hand: 360 degrees / 12 hours = 30 degrees per hour, plus minute contribution
  const hourAngle = ((currentTime.hour % 12) * 30) + (currentTime.minute * 0.5) - 90;
  // Minute hand: 360 degrees / 60 minutes = 6 degrees per minute
  const minuteAngle = (currentTime.minute * 6) - 90;

  // Hand lengths (relative to face radius)
  const hourHandLength = faceRadius * 0.5;
  const minuteHandLength = faceRadius * 0.7;

  // Calculate hand endpoints
  const hourHandX = center + Math.cos((hourAngle * Math.PI) / 180) * hourHandLength;
  const hourHandY = center + Math.sin((hourAngle * Math.PI) / 180) * hourHandLength;
  const minuteHandX = center + Math.cos((minuteAngle * Math.PI) / 180) * minuteHandLength;
  const minuteHandY = center + Math.sin((minuteAngle * Math.PI) / 180) * minuteHandLength;

  // Determine if it's day or night for colour theming
  const isDay = currentTime.timeOfDay === TimeOfDay.DAY || currentTime.timeOfDay === TimeOfDay.DAWN;

  // Format time for tooltip
  const displayHour = currentTime.hour > 12
    ? currentTime.hour - 12
    : currentTime.hour === 0
      ? 12
      : currentTime.hour;
  const amPm = currentTime.hour >= 12 ? 'pm' : 'am';
  const displayMinute = currentTime.minute.toString().padStart(2, '0');

  // Roman numerals for clock face
  const romanNumerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  return (
    <div
      className="relative pointer-events-auto cursor-pointer"
      style={{ width: size, height: size }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, #f5f0e1, #e8dcc8)',
            border: '2px solid #8b7355',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            color: '#5a4636',
          }}
        >
          <div className="font-serif font-bold">{displayHour}:{displayMinute} {amPm}</div>
          <div className="text-[10px] opacity-75">{currentTime.timeOfDay}</div>
        </div>
      )}

      {/* SVG clock face */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <defs>
          {/* Parchment gradient for face */}
          <radialGradient id="clockParchment" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f8f4e8" />
            <stop offset="60%" stopColor="#efe6d5" />
            <stop offset="100%" stopColor="#e0d4be" />
          </radialGradient>

          {/* Brass rim gradient */}
          <linearGradient id="brassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a84b" />
            <stop offset="30%" stopColor="#c99a3e" />
            <stop offset="50%" stopColor="#b8892f" />
            <stop offset="70%" stopColor="#c99a3e" />
            <stop offset="100%" stopColor="#d4a84b" />
          </linearGradient>

          {/* Hand gradient */}
          <linearGradient id="handGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a3c2a" />
            <stop offset="50%" stopColor="#2d2416" />
            <stop offset="100%" stopColor="#4a3c2a" />
          </linearGradient>

          {/* Glow filter for center */}
          <filter id="centerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer brass rim */}
        <circle
          cx={center}
          cy={center}
          r={(size / 2) - 1}
          fill="url(#brassGradient)"
        />

        {/* Inner brass ring */}
        <circle
          cx={center}
          cy={center}
          r={(size / 2) - 4}
          fill="none"
          stroke="#8b6914"
          strokeWidth="1"
        />

        {/* Clock face */}
        <circle
          cx={center}
          cy={center}
          r={faceRadius}
          fill="url(#clockParchment)"
        />

        {/* Inner decorative ring */}
        <circle
          cx={center}
          cy={center}
          r={faceRadius - 8}
          fill="none"
          stroke="#d4c4a8"
          strokeWidth="0.5"
          opacity="0.6"
        />

        {/* Hour markers (small ticks) */}
        {Array.from({ length: 60 }, (_, i) => {
          const angle = (i * 6 - 90) * Math.PI / 180;
          const isHour = i % 5 === 0;
          const innerR = faceRadius - (isHour ? 10 : 6);
          const outerR = faceRadius - 3;
          const x1 = center + Math.cos(angle) * innerR;
          const y1 = center + Math.sin(angle) * innerR;
          const x2 = center + Math.cos(angle) * outerR;
          const y2 = center + Math.sin(angle) * outerR;

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isHour ? '#5a4636' : '#a99878'}
              strokeWidth={isHour ? 1.5 : 0.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Roman numerals for main hours */}
        {romanNumerals.map((numeral, i) => {
          const angle = (i * 30 - 90) * Math.PI / 180;
          const r = faceRadius - 18;
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          // Only show 12, 3, 6, 9 for smaller clock
          if (size < 100 && i % 3 !== 0) return null;
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#5a4636"
              fontSize={size < 100 ? 7 : 9}
              fontFamily="serif"
              fontWeight="bold"
            >
              {numeral}
            </text>
          );
        })}

        {/* Minute hand (longer, thinner) - outline for visibility */}
        <line
          x1={center}
          y1={center}
          x2={minuteHandX}
          y2={minuteHandY}
          stroke="#f5f0e1"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <line
          x1={center}
          y1={center}
          x2={minuteHandX}
          y2={minuteHandY}
          stroke="#1a1510"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Hour hand (shorter, thicker) - outline for visibility */}
        <line
          x1={center}
          y1={center}
          x2={hourHandX}
          y2={hourHandY}
          stroke="#f5f0e1"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <line
          x1={center}
          y1={center}
          x2={hourHandX}
          y2={hourHandY}
          stroke="#1a1510"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Center pin (brass) */}
        <circle
          cx={center}
          cy={center}
          r={3}
          fill="#c99a3e"
          filter="url(#centerGlow)"
        />
        <circle
          cx={center}
          cy={center}
          r={2}
          fill="#d4a84b"
        />

        {/* Day/night indicator (small sun or moon at 12 o'clock position) */}
        {isDay ? (
          <circle
            cx={center}
            cy={center - faceRadius + 22}
            r={4}
            fill="#f4d03f"
            style={{ filter: 'drop-shadow(0 0 2px #ffd700)' }}
          />
        ) : (
          <path
            d={`M ${center + 2} ${center - faceRadius + 22}
                A 4 4 0 1 1 ${center + 2} ${center - faceRadius + 22 - 0.01}
                A 3 3 0 0 0 ${center + 2} ${center - faceRadius + 22}`}
            fill="#e8e0c8"
            style={{ filter: 'drop-shadow(0 0 2px rgba(232, 224, 200, 0.5))' }}
            transform={`translate(-2, 0)`}
          />
        )}
      </svg>
    </div>
  );
};

export default AnalogClock;
