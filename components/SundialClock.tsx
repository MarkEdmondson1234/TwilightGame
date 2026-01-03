import React, { useState } from 'react';
import { GameTime, TimeOfDay } from '../utils/TimeManager';

interface SundialClockProps {
  currentTime: GameTime;
  size?: number;
}

/**
 * SundialClock - A rustic cottagecore calendar dial displaying date and season
 *
 * Design:
 * - Warm parchment/stone background
 * - Wooden/bronze aesthetic
 * - Seasonal colour ring around the edge
 * - Season, day, and year displayed in the center
 */
const SundialClock: React.FC<SundialClockProps> = ({ currentTime, size = 80 }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate angle for the celestial body
  // Midnight (0:00) at bottom, noon (12:00) at top
  const hourAngle = (currentTime.hour * 15) + 90;

  // Radius for the orbiting icon
  const orbitRadius = (size / 2) - 10;

  // Calculate position on the orbit
  const angleRad = (hourAngle * Math.PI) / 180;
  const iconX = Math.cos(angleRad) * orbitRadius;
  const iconY = Math.sin(angleRad) * orbitRadius;

  // Determine if showing sun or moon
  const isDay = currentTime.timeOfDay === TimeOfDay.DAY || currentTime.timeOfDay === TimeOfDay.DAWN;
  const isDusk = currentTime.timeOfDay === TimeOfDay.DUSK;

  // Warm cottagecore season colours
  const seasonColours: Record<string, string> = {
    'Spring': '#8fbc8f', // sage green
    'Summer': '#daa520', // goldenrod
    'Autumn': '#cd853f', // peru/tan
    'Winter': '#b0c4de', // light steel blue
  };
  const seasonColour = seasonColours[currentTime.season] || '#daa520';

  // Tooltip content
  const { daylight } = currentTime;
  const formatHour = (h: number) => {
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hr}${h >= 12 ? 'pm' : 'am'}`;
  };

  // Days remaining in season (84 days per season)
  const daysRemaining = 84 - currentTime.day;

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
          <div className="font-serif font-bold">{currentTime.season}, Day {currentTime.day}</div>
          <div className="font-serif">Year {currentTime.year}</div>
          <div className="mt-1 pt-1 border-t border-amber-600/30 text-[10px]">
            <span style={{ color: seasonColour }}>{daysRemaining} days until next season</span>
          </div>
          <div className="text-[10px] mt-1">
            <span className="text-amber-600">Sunrise:</span> {formatHour(daylight.sunrise)}
            <span className="mx-1">·</span>
            <span className="text-amber-600">Sunset:</span> {formatHour(daylight.sunset)}
          </div>
        </div>
      )}
      {/* SVG sundial face */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <defs>
          {/* Parchment/stone gradient for face */}
          <radialGradient id="parchmentGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f5f0e1" />
            <stop offset="60%" stopColor="#e8dcc8" />
            <stop offset="100%" stopColor="#d4c4a8" />
          </radialGradient>

          {/* Wooden rim gradient */}
          <linearGradient id="woodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b7355" />
            <stop offset="50%" stopColor="#6b5344" />
            <stop offset="100%" stopColor="#8b7355" />
          </linearGradient>

          {/* Inner shadow */}
          <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />
            <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
          </filter>
        </defs>

        {/* Outer wooden rim */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size / 2) - 1}
          fill="url(#woodGradient)"
        />

        {/* Inner wooden ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size / 2) - 4}
          fill="none"
          stroke="#5a4636"
          strokeWidth="1"
        />

        {/* Parchment face */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size / 2) - 6}
          fill="url(#parchmentGradient)"
        />

        {/* Subtle inner ring decoration */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size / 2) - 14}
          fill="none"
          stroke="#c4a882"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Hour markers - small bronze dots */}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
          const markerAngle = (hour * 15 + 90) * Math.PI / 180;
          const markerR = (size / 2) - 10;
          const x = (size / 2) + Math.cos(markerAngle) * markerR;
          const y = (size / 2) + Math.sin(markerAngle) * markerR;
          const isPrimary = hour % 6 === 0;
          return (
            <circle
              key={hour}
              cx={x}
              cy={y}
              r={isPrimary ? 2 : 1}
              fill={isPrimary ? '#8b7355' : '#c4a882'}
            />
          );
        })}

        {/* Night arc - dark blue for night hours (dusk to dawn, wrapping around midnight) */}
        {/* First segment: dusk to midnight (hour 24/0) */}
        <path
          d={describeArc(
            size / 2,
            size / 2,
            (size / 2) - 10,
            daylight.dusk * 15 + 90,
            24 * 15 + 90
          )}
          fill="none"
          stroke="#2d3a4a"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Second segment: midnight to dawn */}
        <path
          d={describeArc(
            size / 2,
            size / 2,
            (size / 2) - 10,
            0 * 15 + 90,
            daylight.dawn * 15 + 90
          )}
          fill="none"
          stroke="#2d3a4a"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Daylight arc - golden for day hours */}
        <path
          d={describeArc(
            size / 2,
            size / 2,
            (size / 2) - 10,
            daylight.sunrise * 15 + 90,
            daylight.sunset * 15 + 90
          )}
          fill="none"
          stroke="#f4d03f"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Dawn arc - soft orange transition */}
        <path
          d={describeArc(
            size / 2,
            size / 2,
            (size / 2) - 10,
            daylight.dawn * 15 + 90,
            daylight.sunrise * 15 + 90
          )}
          fill="none"
          stroke="#e8a854"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Dusk arc - soft orange transition */}
        <path
          d={describeArc(
            size / 2,
            size / 2,
            (size / 2) - 10,
            daylight.sunset * 15 + 90,
            daylight.dusk * 15 + 90
          )}
          fill="none"
          stroke="#d4824a"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      {/* Center text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ pointerEvents: 'none' }}
      >
        {/* Season */}
        <span
          className="font-serif font-bold leading-none"
          style={{
            fontSize: size * 0.15,
            color: seasonColour,
          }}
        >
          {currentTime.season}
        </span>

        {/* Day number */}
        <span
          className="font-serif font-bold leading-none"
          style={{
            fontSize: size * 0.22,
            color: '#5a4636',
          }}
        >
          {currentTime.day}
        </span>

        {/* Year */}
        <span
          className="font-serif leading-none"
          style={{
            color: '#8b7355',
            fontSize: size * 0.1,
          }}
        >
          Yr {currentTime.year}
        </span>
      </div>

      {/* Orbiting sun/moon */}
      <div
        className="absolute"
        style={{
          width: 18,
          height: 18,
          left: (size / 2) + iconX - 9,
          top: (size / 2) + iconY - 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDay ? (
          // Warm sun
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ffd700, #f4a020)',
              boxShadow: '0 0 6px #ffd700',
            }}
          />
        ) : isDusk ? (
          // Sunset orange
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ff8c42, #d4622a)',
              boxShadow: '0 0 4px #ff8c42',
            }}
          />
        ) : (
          // Crescent moon
          <svg width="14" height="14" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 3px rgba(240, 235, 210, 0.6))' }}>
            <defs>
              <linearGradient id="moonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5f0d8" />
                <stop offset="100%" stopColor="#e8e0c8" />
              </linearGradient>
            </defs>
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill="url(#moonGradient)"
            />
          </svg>
        )}
      </div>
    </div>
  );
};

/**
 * Helper function to describe an SVG arc path
 */
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

export default SundialClock;
