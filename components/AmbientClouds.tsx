/**
 * AmbientClouds - Slow-drifting decorative sky clouds for background-image rooms
 *
 * Purely visual, viewport-fixed overlay (not tied to the world/camera - background-image
 * rooms have a static camera, so a simple CSS drift is enough). Each cloud loops
 * seamlessly because both its start and end positions are off-screen.
 */

import React from 'react';
import { Z_SKY_DECORATIONS } from '../zIndex';
import { AmbientCloudConfig } from '../types/maps';

interface AmbientCloudsProps {
  clouds: AmbientCloudConfig[];
}

const DEFAULT_WIDTH_PX = 320;

const AmbientClouds: React.FC<AmbientCloudsProps> = ({ clouds }) => {
  return (
    <>
      {clouds.map((cloud, index) => {
        const widthPx = cloud.widthPx ?? DEFAULT_WIDTH_PX;
        const animationName = `ambientCloudDrift_${index}`;

        return (
          <React.Fragment key={index}>
            <img
              src={cloud.image}
              alt=""
              style={{
                position: 'fixed',
                top: `${cloud.topPercent}%`,
                left: 0,
                width: widthPx,
                opacity: cloud.opacity ?? 1,
                pointerEvents: 'none',
                zIndex: Z_SKY_DECORATIONS,
                animation: `${animationName} ${cloud.durationSeconds}s linear infinite`,
                animationDelay: `${cloud.delaySeconds ?? 0}s`,
              }}
            />
            <style>{`
              @keyframes ${animationName} {
                from { transform: translateX(-${widthPx}px); }
                to { transform: translateX(100vw); }
              }
            `}</style>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default AmbientClouds;
