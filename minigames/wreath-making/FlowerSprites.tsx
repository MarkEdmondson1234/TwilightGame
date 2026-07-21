/**
 * Wreath Making mini-game — small reusable flower sprite renderers.
 *
 * All three fall back to the item's emoji icon when no image is available.
 */

import React from 'react';
import { getItem } from '../../data/items';
import { getFlowerImage } from './wreathHelpers';

/** Small flower sprite for thumbnails — uses circular clip. */
export const FlowerThumb: React.FC<{ itemId: string; size: number }> = ({ itemId, size }) => {
  const imageUrl = getFlowerImage(itemId);
  const item = getItem(itemId);

  if (imageUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <img
          src={imageUrl}
          alt={item?.displayName ?? itemId}
          style={{
            width: size * 1.4,
            height: size * 1.4,
            objectFit: 'contain',
            position: 'absolute',
            left: (size - size * 1.4) / 2,
            top: (size - size * 1.4) / 2,
            pointerEvents: 'none',
          }}
          draggable={false}
        />
      </div>
    );
  }

  return <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{item?.icon ?? '🌼'}</span>;
};

/** Large gallery preview — shows the flower image at full size without clipping. */
export const GalleryPreview: React.FC<{ itemId: string; size: number }> = ({ itemId, size }) => {
  const imageUrl = getFlowerImage(itemId);
  const item = getItem(itemId);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={item?.displayName ?? itemId}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'block',
        }}
        draggable={false}
      />
    );
  }

  return <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{item?.icon ?? '🌼'}</span>;
};

interface FloatingFlowerProps {
  itemId: string;
  /** Live cursor/touch position, read once for the initial paint. */
  initialPos: { x: number; y: number } | null;
  innerRef: React.RefObject<HTMLDivElement | null>;
}

/** Ghost flower that follows the cursor while dragging out of the gallery. */
export const FloatingFlower: React.FC<FloatingFlowerProps> = ({ itemId, initialPos, innerRef }) => {
  const imgUrl = getFlowerImage(itemId);
  const item = getItem(itemId);

  return (
    <div
      ref={innerRef}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        width: 60,
        height: 60,
        transform: 'translate(-50%, -50%)',
        opacity: 0.85,
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
        left: initialPos?.x ?? 0,
        top: initialPos?.y ?? 0,
      }}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          draggable={false}
        />
      ) : (
        <span style={{ fontSize: 30 }}>{item?.icon ?? '🌼'}</span>
      )}
    </div>
  );
};
