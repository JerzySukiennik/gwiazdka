// Gwiazdka: "Cicha noc" (Franz Xaver Gruber, 1818) as melody lanes and left-hand accompaniment.

export const BPM = 88;
export const EIGHTH = 60 / BPM / 2;
export const BAR = EIGHTH * 6;
export const COUNT_IN_BARS = 2;
export const LANES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'];

const MELODY = [
  [['G4', 3], ['A4', 1], ['G4', 2]],
  [['E4', 6]],
  [['G4', 3], ['A4', 1], ['G4', 2]],
  [['E4', 6]],
  [['D5', 4], ['D5', 2]],
  [['B4', 6]],
  [['C5', 4], ['C5', 2]],
  [['G4', 6]],
  [['A4', 4], ['A4', 2]],
  [['C5', 3], ['B4', 1], ['A4', 2]],
  [['G4', 3], ['A4', 1], ['G4', 2]],
  [['E4', 6]],
  [['A4', 4], ['A4', 2]],
  [['C5', 3], ['B4', 1], ['A4', 2]],
  [['G4', 3], ['A4', 1], ['G4', 2]],
  [['E4', 6]],
  [['D5', 4], ['D5', 2]],
  [['F5', 3], ['D5', 1], ['B4', 2]],
  [['C5', 6]],
  [['E5', 6]],
  [['C5', 3], ['G4', 1], ['E4', 2]],
  [['G4', 3], ['F4', 1], ['D4', 2]],
  [['C4', 6]],
];

const CHORDS = ['C', 'C', 'C', 'C', 'G7', 'G7', 'C', 'C', 'F', 'F', 'C', 'C', 'F', 'F', 'C', 'C', 'G7', 'G7', 'C', 'C', 'C', 'G7', 'C'];

const VOICING = {
  C: ['C2', 'G2', 'E3'],
  G7: ['G1', 'F2', 'B2'],
  F: ['F2', 'C3', 'A3'],
};

export const MELODY_START = COUNT_IN_BARS * BAR;
export const SONG_END = MELODY_START + MELODY.length * BAR;

export const NOTES = (() => {
  const out = [];
  MELODY.forEach((bar, b) => {
    let pos = 0;
    for (const [pitch, len] of bar) {
      out.push({
        pitch,
        lane: LANES.indexOf(pitch),
        time: MELODY_START + b * BAR + pos * EIGHTH,
        len: len * EIGHTH,
        eighths: len,
        bar: b,
      });
      pos += len;
    }
  });
  return out;
})();

export const ACCOMP = (() => {
  const out = [];
  const bars = COUNT_IN_BARS + MELODY.length;
  for (let b = 0; b < bars; b++) {
    const chord = b < COUNT_IN_BARS ? 'C' : CHORDS[b - COUNT_IN_BARS];
    const v = VOICING[chord];
    const t0 = b * BAR;
    const last = b === bars - 1;
    const hold = last ? BAR * 2.2 : BAR + 0.12;
    out.push({ pitch: v[0], time: t0, vel: 0.5, dur: hold });
    out.push({ pitch: v[1], time: t0 + 0.035, vel: 0.32, dur: hold });
    out.push({ pitch: v[2], time: t0 + 0.07, vel: 0.3, dur: hold });
    if (last) {
      out.push({ pitch: 'G3', time: t0 + 0.11, vel: 0.24, dur: hold });
      out.push({ pitch: 'C4', time: t0 + 0.15, vel: 0.22, dur: hold });
    } else {
      out.push({ pitch: v[1], time: t0 + 3 * EIGHTH, vel: 0.2, dur: BAR * 0.5 });
      out.push({ pitch: v[2], time: t0 + 3 * EIGHTH + 0.03, vel: 0.19, dur: BAR * 0.5 });
    }
  }
  return out;
})();

export const FLOURISH = [
  { pitch: 'G4', time: 0.0, vel: 0.35, dur: 5 },
  { pitch: 'C5', time: 0.09, vel: 0.38, dur: 5 },
  { pitch: 'E5', time: 0.18, vel: 0.4, dur: 5 },
  { pitch: 'G5', time: 0.27, vel: 0.42, dur: 5 },
  { pitch: 'C6', time: 0.36, vel: 0.45, dur: 6 },
  { pitch: 'D6', time: 0.62, vel: 0.3, dur: 6 },
  { pitch: 'E6', time: 0.86, vel: 0.36, dur: 6 },
  { pitch: 'C2', time: 0.0, vel: 0.4, dur: 6 },
  { pitch: 'G2', time: 0.05, vel: 0.3, dur: 6 },
];
