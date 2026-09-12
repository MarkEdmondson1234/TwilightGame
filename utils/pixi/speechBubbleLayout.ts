/** Wrap using the very same canvas/font that will draw the bubble text. */
export function wrapSpeechText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number
): string[] {
  const lines: string[] = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const paragraph of text.split(/\r\n|\r|\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      // Split an oversized word without separating emoji or combining marks.
      for (const { segment } of segmenter.segment(word)) {
        if (line && measure(line + segment) > maxWidth) {
          lines.push(line);
          line = '';
        }
        line += segment;
      }
    }
    lines.push(line);
  }
  return lines;
}
