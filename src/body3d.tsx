import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { MuscleId } from './types';
import { C, heatColor } from './theme';

/**
 * Döndürülebilir vücut modeli.
 *
 * Her kas bir ya da birkaç elipsoidden oluşur. Model dikey eksen etrafında döndürülür,
 * her elipsoidin ekrandaki izdüşümü bir elips olarak hesaplanır ve arkadan öne doğru
 * çizilir. Hazır 3D model ya da ek kütüphane kullanılmaz.
 *
 * Eksenler: x sağa, y aşağı, z izleyiciye doğru. Model 0 derecede öne bakar.
 * Oranlar yaklaşık yedi buçuk baş boyundaki atletik bir vücuda göredir:
 * çene 46, omuz 68, göğüs ucu 98, göbek 152, kasık 206, diz 300, taban 400.
 */

interface Part {
  /** null: kas olmayan bölge (baş, eklem, gövde dolgusu). */
  m: MuscleId | null;
  c: [number, number, number];
  r: [number, number, number];
  /** Ön düzlemde eğim, derece. */
  tilt?: number;
  /** Öne ya da arkaya yatma, derece. */
  lean?: number;
  /** true ise şekil sol tarafa da aynalanır. */
  mirror?: boolean;
}

const PARTS: Part[] = [
  // Baş ve boyun
  { m: null, c: [0, 24, 2], r: [16, 22, 19] },
  { m: null, c: [0, 52, -2], r: [10, 11, 10.5] },

  // Gövde dolgusu: kasların arasındaki boşlukları kapatır
  { m: null, c: [0, 98, 0], r: [35, 36, 20] },
  { m: null, c: [0, 148, 1], r: [28, 32, 16.5] },
  { m: null, c: [0, 190, 0], r: [30, 21, 18] },

  // Trapez: boyundan omuza inen kısım ve kürek kemikleri arası
  { m: 'traps', c: [18, 63, -5], r: [19, 8.5, 11], tilt: 18, mirror: true },
  { m: 'traps', c: [0, 89, -19.5], r: [13, 28, 6] },

  // Omuz: ön, yan ve arka baş
  { m: 'shoulders', c: [42, 77, 8], r: [10, 14, 9], mirror: true },
  { m: 'shoulders', c: [49, 77, 0], r: [9.5, 15.5, 11], mirror: true },
  { m: 'shoulders', c: [43, 78, -9], r: [10, 14, 9], mirror: true },

  // Göğüs: üst ve alt
  { m: 'chest', c: [19, 85, 15.5], r: [17, 9, 7.5], tilt: -12, mirror: true },
  { m: 'chest', c: [17.5, 97, 17.5], r: [18.5, 12.5, 9], tilt: -4, mirror: true },

  // Üst sırt ve kanat
  { m: 'upperBack', c: [24, 91, -17.5], r: [15, 15, 8], mirror: true },
  { m: 'lats', c: [30, 125, -11.5], r: [13, 28, 13], tilt: 10, mirror: true },

  // Karın: dört sıra, alt karın ve yanlar
  { m: 'abs', c: [8, 119, 17.5], r: [8, 8.6, 4.5], mirror: true },
  { m: 'abs', c: [8, 135.5, 18.2], r: [8, 8.6, 4.5], mirror: true },
  { m: 'abs', c: [7.8, 152, 18], r: [7.8, 8.6, 4.5], mirror: true },
  { m: 'abs', c: [7.2, 168, 17], r: [7.2, 8.6, 4.5], mirror: true },
  { m: 'abs', c: [0, 184, 14.5], r: [12, 10, 5] },
  { m: 'abs', c: [25, 152, 8], r: [8, 26, 13], tilt: 5, mirror: true },

  // Bel
  { m: 'lowerBack', c: [9, 157, -15.5], r: [9, 23, 6], mirror: true },

  // Kalça: ana kas ve üst yan kısım
  { m: 'glutes', c: [16, 202, -13], r: [17, 18.5, 14], mirror: true },
  { m: 'glutes', c: [24, 185, -8], r: [11, 11, 11], mirror: true },

  // Üst kol: dolgu, ön kol kası ve arka kolun iki başı
  { m: null, c: [54.5, 116, 0], r: [8, 25, 8], tilt: -7, mirror: true },
  { m: 'biceps', c: [53.5, 114, 7], r: [8.5, 21, 8.5], tilt: -7, mirror: true },
  { m: 'triceps', c: [52, 113, -7.5], r: [7.5, 24, 8], tilt: -7, mirror: true },
  { m: 'triceps', c: [59, 109, -4], r: [6.5, 18, 7.5], tilt: -7, mirror: true },
  { m: null, c: [59.5, 146, 0], r: [7.5, 8, 8], mirror: true },

  // Ön kol ve el
  { m: 'forearms', c: [64, 165, 1], r: [7.5, 20, 9], tilt: -6, mirror: true },
  { m: 'forearms', c: [59.5, 168, 3], r: [6.5, 19, 8], tilt: -6, mirror: true },
  { m: 'forearms', c: [65.5, 190, 2], r: [6, 14, 6.5], tilt: -5, mirror: true },
  { m: null, c: [68, 216, 4], r: [6.5, 14, 5], tilt: -4, mirror: true },

  // Üst bacak: dolgu, iç bacak, ön bacağın üç görünür başı, arka bacak
  { m: null, c: [18, 250, 0], r: [14, 42, 12], tilt: 2, mirror: true },
  { m: null, c: [7.5, 234, 0], r: [6.5, 24, 11], mirror: true },
  { m: 'quads', c: [25, 249, 6], r: [9.5, 39, 11], tilt: 3, mirror: true },
  { m: 'quads', c: [17, 245, 12], r: [9, 37, 8], tilt: 2, mirror: true },
  { m: 'quads', c: [11.5, 273, 9], r: [7.5, 16, 8], mirror: true },
  { m: 'hamstrings', c: [13.5, 252, -9], r: [8, 38, 10], tilt: 1, mirror: true },
  { m: 'hamstrings', c: [23.5, 251, -8], r: [8.5, 38, 10.5], tilt: 3, mirror: true },

  // Diz, alt bacak ve ayak
  { m: null, c: [18, 300, 3], r: [10.5, 10, 11], mirror: true },
  { m: null, c: [19, 338, 5], r: [8, 30, 8.5], mirror: true },
  { m: 'calves', c: [13.5, 328, -8], r: [7, 23, 9], mirror: true },
  { m: 'calves', c: [22.5, 326, -7], r: [7.5, 24, 9.5], mirror: true },
  { m: null, c: [18, 363, -3], r: [6, 16, 6.5], mirror: true },
  { m: null, c: [19, 392, 9], r: [9, 6.5, 17], mirror: true },
];

type Vec = [number, number, number];

interface Solid {
  m: MuscleId | null;
  c: Vec;
  /** Yerel eksen matrisinin satırları (dönüş × yarıçaplar). */
  rows: [Vec, Vec, Vec];
}

/** Ön-arka kalınlık çarpanı: yandan bakışta gövdenin fazla ince görünmemesi için. */
const DEPTH = 1.36;

const rad = (d: number) => (d * Math.PI) / 180;

function build(p: Part, sign: 1 | -1): Solid {
  const t = rad((p.tilt ?? 0) * sign);
  const l = rad(p.lean ?? 0);
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const cl = Math.cos(l);
  const sl = Math.sin(l);
  const [rx, ry] = p.r;
  const rz = p.r[2] * DEPTH;
  // A = Rz(tilt) · Rx(lean) · diag(r)
  return {
    m: p.m,
    c: [p.c[0] * sign, p.c[1], p.c[2] * DEPTH],
    rows: [
      [ct * rx, -st * cl * ry, st * sl * rz],
      [st * rx, ct * cl * ry, -ct * sl * rz],
      [0, sl * ry, cl * rz],
    ],
  };
}

const SOLIDS: Solid[] = PARTS.flatMap((p) => (p.mirror ? [build(p, 1), build(p, -1)] : [build(p, 1)]));

interface Drawn {
  key: number;
  m: MuscleId | null;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Elipsin eğimi, radyan. */
  rot: number;
  depth: number;
}

/** Modeli verilen açıyla döndürüp arkadan öne sıralı elipslere çevirir. */
function project(angle: number): Drawn[] {
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);
  const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const out = SOLIDS.map((s, key) => {
    // Dönüşten sonra ekran x satırı: cos·satır0 + sin·satır2. y satırı değişmez.
    const r0: Vec = [
      cs * s.rows[0][0] + sn * s.rows[2][0],
      cs * s.rows[0][1] + sn * s.rows[2][1],
      cs * s.rows[0][2] + sn * s.rows[2][2],
    ];
    const r1 = s.rows[1];
    const a = dot(r0, r0);
    const b = dot(r0, r1);
    const c = dot(r1, r1);
    const mid = (a + c) / 2;
    const dev = Math.sqrt(((a - c) / 2) * ((a - c) / 2) + b * b);
    return {
      key,
      m: s.m,
      cx: s.c[0] * cs + s.c[2] * sn,
      cy: s.c[1],
      rx: Math.sqrt(Math.max(0.01, mid + dev)),
      ry: Math.sqrt(Math.max(0.01, mid - dev)),
      rot: 0.5 * Math.atan2(2 * b, a - c),
      depth: -s.c[0] * sn + s.c[2] * cs,
    };
  });
  return out.sort((p, q) => p.depth - q.depth);
}

/** Derinliğe göre karartma: arkadaki şekiller biraz daha koyu görünür. */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(Math.max(0, Math.min(255, v * k)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

const NEUTRAL = '#32322f';
const VIEW_W = 176;
const VIEW_H = 412;
const TWO_PI = Math.PI * 2;

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
    for (let i = drawn.length - 1; i >= 0; i--) {
      const d = drawn[i];
      const dx = vx - d.cx;
      const dy = vy - d.cy;
      const c = Math.cos(-d.rot);
      const s = Math.sin(-d.rot);
      const u = (dx * c - dy * s) / d.rx;
      const v = (dx * s + dy * c) / d.ry;
      if (u * u + v * v <= 1) {
        // En öndeki şekil kas değilse arkasında kalan kas seçilmez.
        if (d.m) onSelect(d.m);
        return;
      }
    }
  };

  const face = facing(angle);
  const perPixel = size.w ? (Math.PI * 1.4) / size.w : 0;

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View
        style={{ width: '100%', maxWidth: 250, aspectRatio: VIEW_W / VIEW_H }}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <Svg viewBox={`${-VIEW_W / 2} 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%">
          <Defs>
            {/* Her şeklin üstüne binen ışık: sol üstte parlak, kenarlarda koyu. Küre hissini verir. */}
            <RadialGradient id="bodyLight" cx="36%" cy="30%" r="78%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.22} />
              <Stop offset="0.45" stopColor="#ffffff" stopOpacity={0} />
              <Stop offset="0.62" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.4} />
            </RadialGradient>
            <RadialGradient id="bodyGround" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={0} cy={400} rx={62} ry={9} fill="url(#bodyGround)" />
          {drawn.map((d) => {
            const on = d.m != null && d.m === selected;
            const base = d.m ? heatColor(values[d.m] ?? 0) : NEUTRAL;
            const k = 0.8 + 0.2 * Math.max(0, Math.min(1, (d.depth + 26) / 52));
            const tf = `rotate(${(d.rot * 180) / Math.PI} ${d.cx} ${d.cy})`;
            return (
              <React.Fragment key={d.key}>
                <Ellipse cx={d.cx} cy={d.cy} rx={d.rx} ry={d.ry} fill={shade(base, k)} transform={tf} />
                <Ellipse
                  cx={d.cx}
                  cy={d.cy}
                  rx={d.rx}
                  ry={d.ry}
                  fill="url(#bodyLight)"
                  stroke={on ? '#ffffff' : '#000000'}
                  strokeOpacity={on ? 1 : 0.28}
                  strokeWidth={on ? 1.6 : 0.5}
                  transform={tf}
                />
              </React.Fragment>
            );
          })}
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
