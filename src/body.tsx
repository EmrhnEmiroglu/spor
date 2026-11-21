import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { MuscleId } from './types';
import { C, heatColor } from './theme';
import { T } from './ui';

interface Shape {
  /** null: kas olmayan bölge (baş, el, diz). */
  m: MuscleId | null;
  d: string;
  /** true ise şekil sağ tarafa da aynalanır. */
  mirror?: boolean;
}

const ell = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx},${cy} a${rx},${ry} 0 1 0 ${rx * 2},0 a${rx},${ry} 0 1 0 ${-rx * 2},0`;

const HEAD: Shape[] = [
  { m: null, d: ell(100, 28, 16, 18) },
  { m: null, d: 'M92,44 L108,44 L110,58 L90,58 Z' },
];
const DELT = 'M67,63 Q54,63 50,76 Q48,88 53,97 Q62,93 67,82 Q70,72 67,63 Z';
const UPPER_ARM = 'M52,100 Q45,108 44,124 Q44,136 48,143 L59,143 Q64,130 64,116 Q63,104 60,97 Q56,100 52,100 Z';
const LIMBS: Shape[] = [
  { m: 'forearms', d: 'M47,147 Q40,156 37,174 Q36,190 38,200 L47,201 Q55,184 58,166 Q59,154 58,147 Z', mirror: true },
  { m: null, d: ell(41, 211, 7, 8), mirror: true },
  { m: null, d: ell(84, 304, 10, 8), mirror: true },
  { m: null, d: ell(84, 390, 10, 5), mirror: true },
];

const FRONT: Shape[] = [
  ...HEAD,
  { m: 'traps', d: 'M90,50 L90,60 L68,64 Q82,58 90,50 Z', mirror: true },
  { m: 'shoulders', d: DELT, mirror: true },
  { m: 'chest', d: 'M99,66 L99,103 Q86,108 76,100 Q69,92 70,80 Q71,68 80,65 Z', mirror: true },
  { m: 'biceps', d: UPPER_ARM, mirror: true },
  { m: 'abs', d: 'M88,108 Q100,104 112,108 L112,170 Q100,182 88,170 Z' },
  { m: 'abs', d: 'M85,108 L75,103 Q72,130 75,158 Q77,172 84,180 L85,172 Z', mirror: true },
  { m: null, d: 'M77,183 L86,186 Q100,194 114,186 L123,183 L126,198 L100,210 L74,198 Z' },
  { m: 'quads', d: 'M73,203 Q66,244 73,292 L93,294 Q98,250 97,215 Z', mirror: true },
  { m: 'calves', d: 'M75,316 Q69,342 78,380 L90,380 Q97,342 93,316 Z', mirror: true },
  ...LIMBS,
];

const BACK: Shape[] = [
  ...HEAD,
  { m: 'traps', d: 'M100,46 L91,56 L69,64 L91,80 L100,114 L109,80 L131,64 L109,56 Z' },
  { m: 'shoulders', d: DELT, mirror: true },
  { m: 'upperBack', d: 'M70,67 L89,82 L97,112 L72,99 Q69,83 70,67 Z', mirror: true },
  { m: 'lats', d: 'M72,102 L97,115 L98,152 L83,152 Q73,130 72,102 Z', mirror: true },
  { m: 'lowerBack', d: 'M83,155 L117,155 L122,180 L78,180 Z' },
  { m: 'triceps', d: UPPER_ARM, mirror: true },
  { m: 'glutes', d: 'M77,183 L98.5,183 L98.5,216 Q84,222 73,210 Q72,195 77,183 Z', mirror: true },
  { m: 'hamstrings', d: 'M73,214 Q67,252 74,292 L93,294 Q98,256 97,222 Q85,226 73,214 Z', mirror: true },
  { m: 'calves', d: 'M74,316 Q67,340 78,380 L90,380 Q99,340 94,316 Z', mirror: true },
  ...LIMBS,
];

const NEUTRAL = '#232321';

function Figure({
  shapes,
  values,
  selected,
  onSelect,
}: {
  shapes: Shape[];
  values: Record<MuscleId, number>;
  selected: MuscleId | null;
  onSelect: (m: MuscleId) => void;
}) {
  const draw = (s: Shape, key: string) => {
    const on = s.m != null && s.m === selected;
    const muscle = s.m;
    return (
      <Path
        key={key}
        d={s.d}
        fill={muscle ? heatColor(values[muscle] ?? 0) : NEUTRAL}
        stroke={on ? C.text : C.bg}
        strokeWidth={on ? 2 : 1.5}
        strokeLinejoin="round"
        onPress={muscle ? () => onSelect(muscle) : undefined}
      />
    );
  };
  return (
    <Svg viewBox="0 0 200 400" style={{ width: '100%', aspectRatio: 0.5 }}>
      {shapes.map((s, i) => draw(s, 'l' + i))}
      <G transform="translate(200 0) scale(-1 1)">{shapes.filter((s) => s.mirror).map((s, i) => draw(s, 'r' + i))}</G>
    </Svg>
  );
}

/** Ön ve arka vücut şeması. Her kas, haftalık set sayısına göre renklenir. */
export function BodyMap({
  values,
  selected,
  onSelect,
}: {
  values: Record<MuscleId, number>;
  selected: MuscleId | null;
  onSelect: (m: MuscleId) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
      {(
        [
          ['Ön', FRONT],
          ['Arka', BACK],
        ] as const
      ).map(([label, shapes]) => (
        <View key={label} style={{ flex: 1, maxWidth: 190, alignItems: 'center' }}>
          <Figure shapes={shapes} values={values} selected={selected} onSelect={onSelect} />
          <T v="label" style={{ marginTop: 4 }}>{label}</T>
        </View>
      ))}
    </View>
  );
}
