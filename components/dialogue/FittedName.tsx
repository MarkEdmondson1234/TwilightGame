import React, { useLayoutEffect, useRef } from 'react';

/** Fit the complete label to the artwork's actual box, including after rotation/font load. */
export default function FittedName({ name, extra }: { name: string; extra?: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    let disposed = false;
    const fit = () => {
      if (disposed || !box.clientWidth || !box.clientHeight) return;
      // Wrapping before shrinking keeps long names readable on narrow phones.
      for (let size = 24; size >= 10; size--) {
        text.style.fontSize = `${size}px`;
        if (text.scrollWidth <= box.clientWidth && text.scrollHeight <= box.clientHeight) break;
      }
    };
    fit();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
    observer?.observe(box);
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit);
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [name, extra]);
  return (
    <div
      ref={boxRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <span
        ref={textRef}
        style={{
          display: 'block',
          maxWidth: '100%',
          textAlign: 'center',
          fontSize: 24,
          lineHeight: 1.05,
          overflowWrap: 'anywhere',
        }}
      >
        {name}
        {extra}
      </span>
    </div>
  );
}
