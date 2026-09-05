/** Original, deterministic sound design for Lava Leap. No samples or external licences.
 * Run: node scripts/generate-lava-audio.mjs
 * Writes mono PCM WAVs; AudioManager supplies the game's shared mixer and effects.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../public/assets/audio/sfx/lava-leap/', import.meta.url));
mkdirSync(directory, { recursive: true });
const rate = 22050;
const sine = (frequency, t) => Math.sin(2 * Math.PI * frequency * t);
function bell(t, frequency) {
  if (t < 0) return 0;
  return (
    (sine(frequency, t) * Math.exp(-t * 5) + 0.26 * sine(frequency * 2.76, t) * Math.exp(-t * 12)) *
    Math.min(1, t * 160)
  );
}
const designs = {
  warning: [
    1.25,
    (t, n, low) =>
      low * 0.55 +
      sine(58, t) * 0.18 +
      bell(t, 240) * 0.2 +
      bell(t - 0.4, 290) * 0.24 +
      bell(t - 0.8, 340) * 0.3,
  ],
  eruption: [
    1.2,
    (t, n, low) =>
      (low * 1.8 + n * 0.09 + sine(43 + 12 * Math.sin(t * 9), t) * 0.16) *
      (0.65 + 0.35 * Math.sin(t * 19) ** 2),
  ],
  frost: [
    0.75,
    (t, n, low) =>
      (n - low) * 0.12 * Math.exp(-t * 6) +
      bell(t, 1046) * 0.28 +
      bell(t - 0.07, 1568) * 0.17 +
      bell(t - 0.14, 2093) * 0.09,
  ],
  wind: [
    0.85,
    (t, n, low) =>
      low * 1.3 * Math.sin((Math.PI * t) / 0.85) ** 2 +
      sine(180 * t + 260, t) * 0.035 * Math.sin((Math.PI * t) / 0.85),
  ],
  treasure: [0.5, (t) => bell(t, 1318) * 0.25 + bell(t - 0.065, 1975) * 0.13],
  haven: [1.1, (t) => bell(t, 523) * 0.25 + bell(t - 0.13, 659) * 0.22 + bell(t - 0.26, 784) * 0.2],
  rescue: [
    0.75,
    (t, n, low) =>
      low * 0.2 * Math.exp(-t * 5) +
      bell(t, 784) * 0.18 +
      bell(t - 0.12, 659) * 0.16 +
      bell(t - 0.24, 523) * 0.18,
  ],
  jump: [
    0.18,
    (t, n, low) => low * 0.55 * Math.sin((Math.PI * t) / 0.18) + sine(220 + t * 250, t) * 0.035,
  ],
  land: [0.16, (t, n, low) => (low * 0.8 + n * 0.04 + sine(95, t) * 0.09) * Math.exp(-t * 24)],
  finish: [
    1.4,
    (t) =>
      bell(t, 523) * 0.23 +
      bell(t - 0.15, 659) * 0.2 +
      bell(t - 0.3, 784) * 0.2 +
      bell(t - 0.5, 1046) * 0.18,
  ],
};
for (const [name, [duration, sound]] of Object.entries(designs)) {
  const length = Math.ceil(duration * rate);
  const wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(length * 2, 40);
  let seed = 8128,
    low = 0;
  for (let i = 0; i < length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    low += 0.085 * (noise - low);
    const t = i / rate;
    const envelope = Math.min(1, t / 0.012, (duration - t) / 0.06);
    const sample = Math.tanh(sound(t, noise, low)) * envelope * 0.8;
    wav.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  writeFileSync(`${directory}/${name}.wav`, wav);
}
console.log(`Generated ${Object.keys(designs).length} Lava Leap effects.`);
