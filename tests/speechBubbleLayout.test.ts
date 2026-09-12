import { expect, it } from 'vitest';
import { wrapSpeechText } from '../utils/pixi/speechBubbleLayout';

it('keeps all words within the measured line width across short and long messages', () => {
  const measure = (text: string) => text.length * 8;
  for (const text of [
    'hello',
    'for very long sentences still trying to fit all the words in the bubble',
    'W'.repeat(140),
    'short again',
  ]) {
    const lines = wrapSpeechText(text, 260, measure);
    expect(lines.every((line) => measure(line) <= 260)).toBe(true);
    expect(lines.join('').replace(/ /g, '')).toBe(text.replace(/ /g, ''));
  }
});

it('preserves explicit newlines and keeps joined emoji intact when breaking long words', () => {
  const emoji = '👩‍🌾';
  const measure = (text: string) =>
    [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length * 15;
  expect(wrapSpeechText(`${emoji.repeat(3)}\nhello`, 30, measure)).toEqual([
    emoji.repeat(2),
    emoji,
    'he',
    'll',
    'o',
  ]);
});
