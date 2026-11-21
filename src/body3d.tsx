import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { MuscleId } from './types';
import { C, heatColor } from './theme';

/**
 * Döndürülebilir vücut modeli.
 *
 * Vücut beş pürüzsüz parçadan oluşur: gövde (baş dahil), iki kol, iki bacak. Her parça,
 * yukarıdan aşağı dizilmiş elips kesitlerle tanımlanır. Model dikey eksen etrafında
 * döndürüldüğünde her kesitin ekrandaki genişliği hesaplanır ve parçanın dış hattı çizilir.
 *
 * Kaslar bu yüzeyin üstündeki bölgelerdir: bir yükseklik aralığı ve kesit çevresinde bir
 * açı aralığı. Yüzeyle birlikte döner, arkaya geçince görünmez olur.
 *
 * Eksenler: x sağa, y aşağı, z izleyiciye doğru. Açı: 90 ön, 0 sağ yan, 180 sol yan, 270 arka.
 * Hazır 3D model ya da 3D kütüphane kullanılmaz.
 */

// ---------- Vücut parçaları ----------

interface Key {
  y: number;
  /** Kesit merkezinin yana kayması. */
  cx?: number;
  /** Kesit merkezinin öne (+) ya da arkaya (-) kayması. */
  cz?: number;
  /** Yarı genişlik (x yönünde). */
  rx: number;
  /** Yarı derinlik (z yönünde). */
  rz: number;
}

type SegName = 'trunk' | 'arm' | 'leg';

const TRUNK: Key[] = [
  { y: 3, rx: 2, rz: 2, cz: 2 },
  { y: 8, rx: 10, rz: 12, cz: 2 },
  { y: 16, rx: 14.5, rz: 17, cz: 2 },
  { y: 26, rx: 15.5, rz: 18.5, cz: 2.5 },
  { y: 36, rx: 14, rz: 17, cz: 3 },
  { y: 43, rx: 11, rz: 13.5, cz: 3 },
  { y: 49, rx: 8.6, rz: 9.5, cz: 0 },
  { y: 55, rx: 9.4, rz: 10, cz: -1 },
  { y: 59, rx: 13, rz: 10.6, cz: -1.5 },
  { y: 63, rx: 20, rz: 12, cz: -1.2 },
  { y: 67, rx: 27, rz: 14, cz: -0.8 },
  { y: 72, rx: 32, rz: 16.5, cz: 0 },
  { y: 78, rx: 35, rz: 18.5, cz: 0.6 },
  { y: 86, rx: 36.6, rz: 20.4, cz: 1.2 },
  { y: 94, rx: 36.5, rz: 21, cz: 1.5 },
  { y: 108, rx: 34.5, rz: 20, cz: 1 },
  { y: 124, rx: 31.5, rz: 18, cz: 0.5 },
  { y: 140, rx: 29, rz: 16.5, cz: 0.5 },
  { y: 152, rx: 28.2, rz: 16, cz: 0.5 },
  { y: 166, rx: 29.5, rz: 17, cz: 0 },
  { y: 180, rx: 32.5, rz: 19.5, cz: -1 },
  { y: 194, rx: 34, rz: 21, cz: -2 },
  { y: 204, rx: 31, rz: 19.5, cz: -1.5 },
  { y: 212, rx: 22, rz: 15, cz: -0.5 },
  { y: 218, rx: 9, rz: 9, cz: 0 },
];

const ARM: Key[] = [
  { y: 61, cx: 43, rx: 2.5, rz: 4, cz: 0 },
  { y: 63, cx: 44.5, rx: 6.5, rz: 8.5, cz: 0 },
  { y: 66, cx: 46, rx: 9.8, rz: 11.8, cz: 0 },
  { y: 70, cx: 47.5, rx: 12, rz: 14, cz: 0 },
  { y: 76, cx: 49, rx: 13.4, rz: 15.4, cz: 0 },
  { y: 84, cx: 50.5, rx: 13.5, rz: 15.5, cz: 0 },
  { y: 96, cx: 52, rx: 11.5, rz: 13.5, cz: 0 },
  { y: 110, cx: 53.5, rx: 11.2, rz: 13.2, cz: 0.5 },
  { y: 124, cx: 55, rx: 10.4, rz: 12, cz: 0.5 },
  { y: 136, cx: 56.8, rx: 9, rz: 10, cz: 0 },
  { y: 144, cx: 58.2, rx: 8.4, rz: 9, cz: 0 },
  { y: 154, cx: 60, rx: 9.6, rz: 10.2, cz: 0.5 },
  { y: 166, cx: 61.8, rx: 9.2, rz: 9.6, cz: 1 },
  { y: 180, cx: 63.8, rx: 7.8, rz: 7.8, cz: 1.5 },
  { y: 194, cx: 65.6, rx: 6.2, rz: 5.8, cz: 2 },
  { y: 204, cx: 66.8, rx: 5.4, rz: 4.8, cz: 2.5 },
  { y: 212, cx: 67.8, rx: 6.8, rz: 4.4, cz: 3 },
  { y: 224, cx: 68.8, rx: 6.6, rz: 4.2, cz: 3.5 },
  { y: 234, cx: 69, rx: 4.6, rz: 3.4, cz: 4 },
  { y: 240, cx: 69, rx: 1.5, rz: 1.5, cz: 4 },
];

const LEG: Key[] = [
  { y: 192, cx: 16, rx: 9, rz: 12, cz: -1 },
  { y: 200, cx: 17, rx: 15.5, rz: 18, cz: -1 },
  { y: 214, cx: 18, rx: 17, rz: 19, cz: 0 },
  { y: 232, cx: 18.5, rx: 16.4, rz: 18.6, cz: 0.5 },
  { y: 252, cx: 18.8, rx: 15, rz: 17, cz: 0.5 },
  { y: 272, cx: 18.8, rx: 12.8, rz: 14.4, cz: 0.5 },
  { y: 288, cx: 18.6, rx: 11, rz: 12.4, cz: 1 },
  { y: 298, cx: 18.6, rx: 10.4, rz: 11.8, cz: 1.5 },
  { y: 308, cx: 18.8, rx: 10, rz: 11.4, cz: 0 },
  { y: 322, cx: 19.2, rx: 11, rz: 13.2, cz: -2 },
  { y: 336, cx: 19.2, rx: 10.4, rz: 12.4, cz: -2 },
  { y: 352, cx: 19, rx: 8.4, rz: 9.6, cz: -1 },
  { y: 368, cx: 18.8, rx: 6.4, rz: 7, cz: 0 },
  { y: 380, cx: 18.8, rx: 5.4, rz: 6.2, cz: 0.5 },
  { y: 387, cx: 19, rx: 6.4, rz: 9.5, cz: 4 },
  { y: 394, cx: 19.4, rx: 7.8, rz: 14.5, cz: 8 },
  { y: 400, cx: 19.4, rx: 7.4, rz: 14, cz: 8.5 },
  { y: 403, cx: 19.4, rx: 4, rz: 9, cz: 8.5 },
];

interface Slice {
  y: number;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
}

const STEP = 2;

/** Anahtar kesitlerin arasını yumuşak eğriyle doldurur (Catmull-Rom). */
function densify(keys: Key[], sign: 1 | -1): Slice[] {
  const get = (k: Key) => [k.cx ?? 0, k.cz ?? 0, k.rx, k.rz];
  const out: Slice[] = [];
  const y0 = keys[0].y;
  const y1 = keys[keys.length - 1].y;
  let i = 0;
  for (let y = y0; y <= y1 + 0.001; y += STEP) {
    while (i < keys.length - 2 && y > keys[i + 1].y) i++;
    const p1 = get(keys[i]);
    const p2 = get(keys[i + 1]);
    const p0 = get(keys[Math.max(0, i - 1)]);
    const p3 = get(keys[Math.min(keys.length - 1, i + 2)]);
    const t = Math.min(1, Math.max(0, (y - keys[i].y) / (keys[i + 1].y - keys[i].y)));
    const v = p1.map((_, j) => {
      const a = p0[j];
      const b = p1[j];
      const c = p2[j];
      const d = p3[j];
      return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    });
    out.push({ y, cx: v[0] * sign, cz: v[1], rx: Math.max(0.6, v[2]), rz: Math.max(0.6, v[3]) });
  }
  return out;
}

interface Segment {
  name: SegName;
  sign: 1 | -1;
  slices: Slice[];
  /** Eşit derinlikte çizim sırası: bacaklar, gövde, kollar. */
  order: number;
}

const SEGMENTS: Segment[] = [
  { name: 'leg', sign: 1, slices: densify(LEG, 1), order: 0 },
  { name: 'leg', sign: -1, slices: densify(LEG, -1), order: 0 },
  { name: 'trunk', sign: 1, slices: densify(TRUNK, 1), order: 1 },
  { name: 'arm', sign: 1, slices: densify(ARM, 1), order: 2 },
  { name: 'arm', sign: -1, slices: densify(ARM, -1), order: 2 },
];

function sliceAt(slices: Slice[], y: number): Slice {
  const f = (y - slices[0].y) / STEP;
  const i = Math.max(0, Math.min(slices.length - 2, Math.floor(f)));
  const t = Math.max(0, Math.min(1, f - i));
  const a = slices[i];
  const b = slices[i + 1];
  return {
    y,
    cx: a.cx + (b.cx - a.cx) * t,
    cz: a.cz + (b.cz - a.cz) * t,
    rx: a.rx + (b.rx - a.rx) * t,
    rz: a.rz + (b.rz - a.rz) * t,
  };
}

// ---------- Kas bölgeleri ----------

type Shape = 'almond' | 'round' | 'block';
const SHAPE_POW: Record<Shape, number> = { almond: 0.75, round: 0.42, block: 0.22 };

interface Patch {
  /** null: kas olmayan yüzey ayrıntısı (yüz). */
  m: MuscleId | null;
  seg: SegName;
  y0: number;
  y1: number;
  /** Bölgenin merkez açısı (derece), üstte ve altta. */
  c0: number;
  c1?: number;
  /** En geniş yerindeki yarı açı genişliği (derece). */
  hw: number;
  /** Genişlik çarpanı, üstte ve altta. */
  s0?: number;
  s1?: number;
  shape?: Shape;
  /** Gövdede: sol tarafa da aynalanır. Kol ve bacakta parça zaten çifttir. */
  mirror?: boolean;
}

const PATCHES: Patch[] = [
  // Yüz: yönün anlaşılması için
  { m: null, seg: 'trunk', y0: 14, y1: 41, c0: 90, hw: 34, shape: 'round' },

  // Göğüs
  { m: 'chest', seg: 'trunk', y0: 72, y1: 111, c0: 60, c1: 63, hw: 27, s0: 0.92, s1: 1, shape: 'round', mirror: true },

  // Karın: dört sıra, alt karın ve yan karın
  { m: 'abs', seg: 'trunk', y0: 114, y1: 129, c0: 79.5, hw: 8.6, shape: 'block', mirror: true },
  { m: 'abs', seg: 'trunk', y0: 131, y1: 146, c0: 79.5, hw: 8.6, shape: 'block', mirror: true },
  { m: 'abs', seg: 'trunk', y0: 148, y1: 163, c0: 79.5, hw: 8.6, shape: 'block', mirror: true },
  { m: 'abs', seg: 'trunk', y0: 165, y1: 181, c0: 80, hw: 8.2, shape: 'block', mirror: true },
  { m: 'abs', seg: 'trunk', y0: 183, y1: 206, c0: 90, hw: 15, s0: 1, s1: 0.25, shape: 'round' },
  { m: 'abs', seg: 'trunk', y0: 113, y1: 184, c0: 47, c1: 52, hw: 15, shape: 'almond', mirror: true },

  // Trapez: önden görünen omuz eğimi, arkadan üst kısım ve kürek kemikleri arası
  { m: 'traps', seg: 'trunk', y0: 57, y1: 72, c0: 68, c1: 52, hw: 20, shape: 'almond', mirror: true },
  { m: 'traps', seg: 'trunk', y0: 54, y1: 78, c0: 285, c1: 312, hw: 26, shape: 'round', mirror: true },
  { m: 'traps', seg: 'trunk', y0: 70, y1: 124, c0: 270, hw: 22, s0: 1, s1: 0.5, shape: 'almond' },

  // Üst sırt, kanat ve bel
  { m: 'upperBack', seg: 'trunk', y0: 79, y1: 112, c0: 314, hw: 20, shape: 'round', mirror: true },
  { m: 'lats', seg: 'trunk', y0: 104, y1: 160, c0: 324, c1: 292, hw: 25, s0: 1, s1: 0.5, shape: 'round', mirror: true },
  { m: 'lowerBack', seg: 'trunk', y0: 128, y1: 182, c0: 281, hw: 9.5, shape: 'block', mirror: true },

  // Kalça
  { m: 'glutes', seg: 'trunk', y0: 178, y1: 216, c0: 306, hw: 31, shape: 'round', mirror: true },

  // Omuz: ön, yan ve arka baş
  { m: 'shoulders', seg: 'arm', y0: 65, y1: 101, c0: 70, hw: 32, s0: 1, s1: 0.55, shape: 'round' },
  { m: 'shoulders', seg: 'arm', y0: 63, y1: 103, c0: 0, hw: 34, s0: 1, s1: 0.5, shape: 'round' },
  { m: 'shoulders', seg: 'arm', y0: 65, y1: 101, c0: 290, hw: 32, s0: 1, s1: 0.55, shape: 'round' },

  // Üst kol
  { m: 'biceps', seg: 'arm', y0: 100, y1: 145, c0: 100, hw: 44, shape: 'almond' },
  { m: 'triceps', seg: 'arm', y0: 98, y1: 138, c0: 326, hw: 28, shape: 'almond' },
  { m: 'triceps', seg: 'arm', y0: 100, y1: 143, c0: 255, hw: 35, shape: 'almond' },

  // Ön kol
  { m: 'forearms', seg: 'arm', y0: 138, y1: 188, c0: 25, hw: 30, shape: 'almond' },
  { m: 'forearms', seg: 'arm', y0: 148, y1: 203, c0: 120, hw: 48, s0: 1, s1: 0.6, shape: 'almond' },
  { m: 'forearms', seg: 'arm', y0: 148, y1: 203, c0: 300, hw: 50, s0: 1, s1: 0.6, shape: 'almond' },

  // Ön bacak: dış, orta ve iç baş
  { m: 'quads', seg: 'leg', y0: 218, y1: 294, c0: 35, hw: 27, shape: 'almond' },
  { m: 'quads', seg: 'leg', y0: 214, y1: 292, c0: 92, hw: 26, shape: 'almond' },
  { m: 'quads', seg: 'leg', y0: 248, y1: 298, c0: 148, hw: 24, s0: 0.55, s1: 1, shape: 'almond' },

  // Arka bacak
  { m: 'hamstrings', seg: 'leg', y0: 218, y1: 294, c0: 313, hw: 24, shape: 'almond' },
  { m: 'hamstrings', seg: 'leg', y0: 218, y1: 294, c0: 248, hw: 26, shape: 'almond' },

  // Baldır: dış ve iç baş
  { m: 'calves', seg: 'leg', y0: 306, y1: 356, c0: 316, hw: 27, s0: 1, s1: 0.6, shape: 'round' },
  { m: 'calves', seg: 'leg', y0: 306, y1: 360, c0: 238, hw: 28, s0: 1, s1: 0.6, shape: 'round' },
];

interface PatchRT {
  m: MuscleId | null;
  seg: number;
  y0: number;
  y1: number;
  c0: number;
  c1: number;
  hw: number;
  s0: number;
  s1: number;
  pow: number;
}

const rad = (d: number) => (d * Math.PI) / 180;

const PATCH_RT: PatchRT[] = [];
SEGMENTS.forEach((seg, si) => {
  for (const p of PATCHES) {
    if (p.seg !== seg.name) continue;
    const base = {
      m: p.m,
      seg: si,
      y0: p.y0,
      y1: p.y1,
      hw: rad(p.hw),
      s0: p.s0 ?? 1,
      s1: p.s1 ?? 1,
      pow: SHAPE_POW[p.shape ?? 'almond'],
    };
    const c0 = p.c0;
    const c1 = p.c1 ?? p.c0;
    // Sol taraftaki parçada ve gövdenin aynalanan bölgelerinde açı yansıtılır.
    if (seg.sign === 1) PATCH_RT.push({ ...base, c0: rad(c0), c1: rad(c1) });
    if (seg.sign === -1 || p.mirror) PATCH_RT.push({ ...base, c0: rad(180 - c0), c1: rad(180 - c1) });
  }
});

// ---------- İzdüşüm ----------

type Pt = [number, number];

interface DrawnPatch {
  key: string;
  m: MuscleId | null;
  d: string;
  poly: Pt[];
}

interface DrawnSegment {
  key: number;
  d: string;
  poly: Pt[];
  depth: number;
  order: number;
  patches: DrawnPatch[];
}

const TWO_PI = Math.PI * 2;

/** Açıyı (-pi, pi] aralığına indirger. */
function wrap(a: number): number {
  let x = a % TWO_PI;
  if (x > Math.PI) x -= TWO_PI;
  if (x <= -Math.PI) x += TWO_PI;
  return x;
}

function pathOf(left: Pt[], right: Pt[]): { d: string; poly: Pt[] } {
  const poly = [...left, ...[...right].reverse()];
  const d = poly.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('') + 'Z';
  return { d, poly };
}

/** Modeli verilen açıyla döndürüp çizilecek parçaları, arkadan öne sıralı olarak verir. */
function project(angle: number): DrawnSegment[] {
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);

  const out: DrawnSegment[] = SEGMENTS.map((seg, key) => {
    const left: Pt[] = [];
    const right: Pt[] = [];
    let depth = 0;
    for (const s of seg.slices) {
      const x = s.cx * cs + s.cz * sn;
      const w = Math.sqrt(s.rx * s.rx * cs * cs + s.rz * s.rz * sn * sn);
      left.push([x - w, s.y]);
      right.push([x + w, s.y]);
      depth += -s.cx * sn + s.cz * cs;
    }
    return { key, ...pathOf(left, right), depth: depth / seg.slices.length, order: seg.order, patches: [] };
  });

  PATCH_RT.forEach((p, pi) => {
    const seg = SEGMENTS[p.seg];
    let left: Pt[] = [];
    let right: Pt[] = [];
    let run = 0;
    const flush = () => {
      if (left.length >= 2) out[p.seg].patches.push({ key: `${pi}-${run++}`, m: p.m, ...pathOf(left, right) });
      left = [];
      right = [];
    };
    const n = Math.max(4, Math.ceil((p.y1 - p.y0) / 2.5));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = sliceAt(seg.slices, p.y0 + (p.y1 - p.y0) * t);
      const x = s.cx * cs + s.cz * sn;
      const w = Math.sqrt(s.rx * s.rx * cs * cs + s.rz * s.rz * sn * sn);
      // Kesitin görünen yarısı, alfa açısından başlayan yarım turdur.
      const alpha = Math.atan2(s.rz * sn, s.rx * cs);
      const half = p.hw * (p.s0 + (p.s1 - p.s0) * t) * Math.pow(Math.sin(Math.PI * t), p.pow);
      const c = p.c0 + (p.c1 - p.c0) * t;
      const u1 = wrap(c - half - alpha);
      const lo = Math.max(u1, 0);
      const hi = Math.min(u1 + 2 * half, Math.PI);
      if (hi - lo < 0.012) {
        // Uçlarda bölge sıfıra iner; görünen kısımdaysa sivri uç olarak eklenir.
        if (half < 0.012 && u1 > 0 && u1 < Math.PI) {
          const px = x + w * Math.cos(u1);
          left.push([px, s.y]);
          right.push([px, s.y]);
        } else {
          flush();
        }
        continue;
      }
      left.push([x + w * Math.cos(hi), s.y]);
      right.push([x + w * Math.cos(lo), s.y]);
    }
    flush();
  });

  // Çizim sırası: bacaklar her zaman gövdenin altında kalır (kalça birleşimi kapanır).
  // Kollardan gövdenin arkasında kalan önce, diğerleri gövdeden sonra çizilir.
  const trunkDepth = out[2].depth;
  const rank = (s: DrawnSegment) => {
    if (s.order === 0) return 0;
    if (s.order === 1) return 2;
    return s.depth < trunkDepth - 3 ? 1 : 3;
  };
  return out.sort((a, b) => rank(a) - rank(b) || a.depth - b.depth);
}

function inside(poly: Pt[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// ---------- Görünüm ----------

const SKIN = '#34342f';
const FACE = '#3a3a35';
const LINE = '#151514';
const VIEW_W = 176;
const VIEW_H = 414;

function facing(angle: number): string {
  const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  if (a < Math.PI / 4 || a > (7 * Math.PI) / 4) return 'Ön';
  if (a > (3 * Math.PI) / 4 && a < (5 * Math.PI) / 4) return 'Arka';
  return 'Yan';
}

export function Body3D({
  values,
  selected,
  onSelect,
}: {
  values: Record<MuscleId, number>;
  selected: MuscleId | null;
  onSelect: (m: MuscleId) => void;
}) {
  const [angle, setAngle] = useState(0.5);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const drag = useRef({ x: 0, lx: 0, ly: 0, a: 0, moved: false, lastX: 0, lastT: 0, v: 0 });
  const anim = useRef<number | null>(null);
  const angleRef = useRef(angle);
  angleRef.current = angle;

  const drawn = useMemo(() => project(angle), [angle]);

  const stopAnim = () => {
    if (anim.current != null) cancelAnimationFrame(anim.current);
    anim.current = null;
  };
  useEffect(() => stopAnim, []);

  /** En kısa yoldan hedef açıya yumuşak dönüş. */
  const turnTo = (target: number) => {
    stopAnim();
    const from = angleRef.current;
    let delta = (((target - from) % TWO_PI) + TWO_PI) % TWO_PI;
    if (delta > Math.PI) delta -= TWO_PI;
    const t0 = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - t0) / 420);
      const e = 1 - Math.pow(1 - t, 3);
      setAngle(from + delta * e);
      anim.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  };

  /** Parmak bırakıldığında model hızını yavaşça kaybederek dönmeye devam eder. */
  const coast = (velocity: number) => {
    stopAnim();
    let v = Math.max(-0.02, Math.min(0.02, velocity));
    let last = Date.now();
    const step = () => {
      const now = Date.now();
      const dt = Math.min(40, now - last);
      last = now;
      setAngle(angleRef.current + v * dt);
      v *= Math.pow(0.994, dt);
      anim.current = Math.abs(v) > 0.0004 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  };

  const hit = (lx: number, ly: number) => {
    if (!size.w) return;
    const k = VIEW_W / size.w;
    const vx = lx * k - VIEW_W / 2;
    const vy = ly * k;
    // Önden arkaya: dokunulan noktadaki en öndeki parça belirleyicidir.
    for (let i = drawn.length - 1; i >= 0; i--) {
      const seg = drawn[i];
      for (let j = seg.patches.length - 1; j >= 0; j--) {
        const p = seg.patches[j];
        if (p.m && inside(p.poly, vx, vy)) {
          onSelect(p.m);
          return;
        }
      }
      if (inside(seg.poly, vx, vy)) return;
    }
  };

  const face = facing(angle);
  const perPixel = size.w ? (Math.PI * 1.4) / size.w : 0;

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View
        style={{ width: '100%', maxWidth: 260, aspectRatio: VIEW_W / VIEW_H }}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <Svg viewBox={`${-VIEW_W / 2} 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%">
          <Defs>
            {/* Parçanın kenarlarını karartıp ortasını aydınlatarak silindir hacmi verir. */}
            <LinearGradient id="bodyRound" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.5} />
              <Stop offset="0.28" stopColor="#000000" stopOpacity={0.06} />
              <Stop offset="0.45" stopColor="#ffffff" stopOpacity={0.09} />
              <Stop offset="0.7" stopColor="#000000" stopOpacity={0.05} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.48} />
            </LinearGradient>
            <RadialGradient id="bodyGround" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={0} cy={403} rx={60} ry={8} fill="url(#bodyGround)" />
          {drawn.map((seg) => (
            <React.Fragment key={seg.key}>
              <Path d={seg.d} fill={SKIN} stroke={LINE} strokeWidth={1.2} strokeLinejoin="round" />
              {seg.patches.map((p) => {
                const on = p.m != null && p.m === selected;
                return (
                  <Path
                    key={p.key}
                    d={p.d}
                    fill={p.m ? heatColor(values[p.m] ?? 0) : FACE}
                    stroke={on ? '#ffffff' : LINE}
                    strokeWidth={on ? 1.5 : 0.9}
                    strokeLinejoin="round"
                  />
                );
              })}
              <Path d={seg.d} fill="url(#bodyRound)" />
            </React.Fragment>
          ))}
        </Svg>
        <View
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, { touchAction: 'pan-y', cursor: 'grab' } as any]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            stopAnim();
            drag.current = {
              x: e.nativeEvent.pageX,
              lx: e.nativeEvent.locationX,
              ly: e.nativeEvent.locationY,
              a: angleRef.current,
              moved: false,
              lastX: e.nativeEvent.pageX,
              lastT: Date.now(),
              v: 0,
            };
          }}
          onResponderMove={(e) => {
            const g = drag.current;
            const x = e.nativeEvent.pageX;
            const dx = x - g.x;
            if (Math.abs(dx) > 5) g.moved = true;
            if (!g.moved || !perPixel) return;
            const now = Date.now();
            const dt = Math.max(1, now - g.lastT);
            // Son hareketlerin yumuşatılmış hızı (radyan / milisaniye).
            g.v = g.v * 0.6 + (((x - g.lastX) * perPixel) / dt) * 0.4;
            g.lastX = x;
            g.lastT = now;
            setAngle(g.a + dx * perPixel);
          }}
          onResponderRelease={() => {
            const g = drag.current;
            if (!g.moved) hit(g.lx, g.ly);
            else if (Date.now() - g.lastT < 80 && Math.abs(g.v) > 0.0015) coast(g.v);
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 19, padding: 3 }}>
        {(
          [
            ['Ön', 0],
            ['Yan', Math.PI / 2],
            ['Arka', Math.PI],
          ] as const
        ).map(([label, target]) => {
          const on = face === label;
          return (
            <Pressable
              key={label}
              onPress={() => turnTo(target)}
              style={{
                minWidth: 68,
                minHeight: 32,
                paddingHorizontal: 12,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? C.surface3 : 'transparent',
              }}
            >
              <Text style={{ color: on ? C.text : C.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>Döndürmek için sağa sola sürükle, ayrıntı için kasa dokun.</Text>
    </View>
  );
}
