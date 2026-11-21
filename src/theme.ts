export const C = {
  bg: '#0d0d0d',
  surface: '#1a1a19',
  surface2: '#242422',
  surface3: '#2e2e2b',
  border: '#2c2c2a',
  borderStrong: '#383835',
  text: '#f0efec',
  text2: '#c3c2b7',
  muted: '#898781',
  accent: '#3987e5',
  accentDim: '#1c3a63',
  onAccent: '#ffffff',
  good: '#0ca30c',
  goodDim: '#12331a',
  warning: '#fab219',
  critical: '#e66767',
  criticalDim: '#3a1d1d',
};

/** Isı haritası: tek renk tonu, azdan çoğa koyudan parlağa. */
export const HEAT_NONE = '#33332f';
export const HEAT_STEPS: { min: number; color: string; label: string }[] = [
  { min: 0.01, color: '#4d2c1e', label: '1–3' },
  { min: 4, color: '#74381d', label: '4–7' },
  { min: 8, color: '#9c4620', label: '8–11' },
  { min: 12, color: '#c45424', label: '12–15' },
  { min: 16, color: '#e86a35', label: '16–19' },
  { min: 20, color: '#ff9a66', label: '20+' },
];

export function heatColor(weeklySets: number): string {
  let c = HEAT_NONE;
  for (const s of HEAT_STEPS) if (weeklySets >= s.min) c = s.color;
  return c;
}
