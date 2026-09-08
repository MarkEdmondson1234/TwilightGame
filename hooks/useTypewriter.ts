import { useState, useEffect, useRef, useCallback } from 'react';

const CHARS_PER_SECOND = 40;
const MS_PER_CHAR = 1000 / CHARS_PER_SECOND;

/**
 * Typewriter hook — reveals text character by character (whole whitespace runs at once,
 * so an accidental run of spaces can't stall the reveal — issue #108).
 * Returns the visible portion of the text and whether it's still typing.
 * Call `skip()` to instantly reveal the full text.
 */
export function useTypewriter(text: string) {
  const [visibleLength, setVisibleLength] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textRef = useRef(text);

  const isComplete = visibleLength >= text.length;

  // Reset when the text changes (new dialogue node)
  useEffect(() => {
    textRef.current = text;

    if (!text) {
      setVisibleLength(0);
      return;
    }

    setVisibleLength(0);

    intervalRef.current = setInterval(() => {
      setVisibleLength((prev) => {
        if (prev >= textRef.current.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return textRef.current.length;
        }
        // Whitespace is invisible — reveal whole runs in one tick, so a pathological
        // space run can't stall the dialogue for minutes. Issue #108: a stray 10k-space
        // paste in a dialogue string typed as ~4 minutes of nothing (looking like a
        // mid-sentence freeze, with the response options gated behind isComplete).
        let next = prev + 1;
        while (next < textRef.current.length && /\s/.test(textRef.current[next])) next++;
        return next;
      });
    }, MS_PER_CHAR);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  const skip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setVisibleLength(textRef.current.length);
  }, []);

  return {
    displayText: text.slice(0, visibleLength),
    isComplete,
    skip,
  };
}
