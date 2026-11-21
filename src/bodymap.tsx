import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { bodyFront } from 'react-native-body-highlighter/dist/assets/bodyFront';
import { bodyBack } from 'react-native-body-highlighter/dist/assets/bodyBack';
import { MuscleId } from './types';
import { C, heatColor } from './theme';

/**
 * Kas haritası: elle çizilmiş anatomik ön ve arka görünüm.
 *
 * Çizim verisi react-native-body-highlighter paketinden gelir (MIT lisansı). Paketin kendi
 * bileşeni yerine yalnızca çizim yolları kullanılır; böylece her kas kendi ısı rengiyle
 * boyanabilir ve sırt bölgesi üst sırt ile kanat olarak ayrılabilir.
 *
 * Sürükleyince ya da düğmelerle model ön ve arka yüz arasında döner.
 */

type Side = 'front' | 'back';

/** Çizimdeki bölge adlarının uygulamadaki kas gruplarına karşılığı. Olmayanlar kas sayılmaz. */
const SLUG_TO_MUSCLE: Record<string, MuscleId> = {
  chest: 'chest',
  deltoids: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearm: 'forearms',
  abs: 'abs',
  obliques: 'abs',
  trapezius: 'traps',
  'upper-back': 'upperBack',
  'lower-back': 'lowerBack',
  gluteal: 'glutes',
  quadriceps: 'quads',
  hamstring: 'hamstrings',
  calves: 'calves',
};

/**
 * Arka görünümde "upper-back" bölgesinin kanat kasına ait parçaları. Çizimde bu bölge
 * tek adla gelir; büyük alt parça kanattır, üstteki iki küçük parça üst sırttır.
 * Parça sırası sol ve sağ tarafta farklıdır.
 */
const LATS_PARTS = ['l1', 'r2'];

interface Shape {
  key: string;
  d: string;
  slug: string;
  muscle: MuscleId | null;
}

function shapesOf(parts: typeof bodyFront, side: Side): Shape[] {
  const out: Shape[] = [];
  for (const part of parts) {
    const slug = part.slug ?? '';
    const add = (list: string[] | undefined, tag: string) =>
      (list ?? []).forEach((d, i) => {
        let muscle: MuscleId | null = SLUG_TO_MUSCLE[slug] ?? null;
        if (side === 'back' && slug === 'upper-back' && LATS_PARTS.includes(`${tag}${i}`)) muscle = 'lats';
        out.push({ key: `${side}-${slug}-${tag}${i}`, d, slug, muscle });
      });
    add(part.path?.common, 'c');
    add(part.path?.left, 'l');
    add(part.path?.right, 'r');
  }
  return out;
}

const SHAPES: Record<Side, Shape[]> = {
  front: shapesOf(bodyFront, 'front'),
  back: shapesOf(bodyBack, 'back'),
};

// Çizimin vücudu kapsayan bölümü: boş kenarlar kırpılır ki figür büyük görünsün.
const VIEW: Record<Side, string> = {
  front: '36 150 652 1215',
  back: '760 150 652 1215',
};
const ASPECT = 652 / 1215;

const SKIN = '#2c2c29';
const HEAD = '#3a3a36';
const HAIR = '#1f1f1d';
const GAP = '#141413';

function Figure({
  side,
  values,
  selected,
  onSelect,
}: {
  side: Side;
  values: Record<MuscleId, number>;
  selected: MuscleId | null;
  onSelect: (m: MuscleId) => void;
}) {
  const shapes = SHAPES[side];
  return (
    <Svg viewBox={VIEW[side]} width="100%" height="100%">
      {/* Alt katman: parçaların arasındaki boşlukları dolduran gövde silueti. */}
      <G>
        {shapes.map((s) => (
          <Path key={'u' + s.key} d={s.d} fill={SKIN} stroke={SKIN} strokeWidth={14} strokeLinejoin="round" />
        ))}
      </G>
      {shapes.map((s) => {
        const on = s.muscle != null && s.muscle === selected;
        const fill = s.muscle ? heatColor(values[s.muscle] ?? 0) : s.slug === 'head' ? HEAD : s.slug === 'hair' ? HAIR : SKIN;
        const muscle = s.muscle;
        return (
          <Path
            key={s.key}
            id={s.key}
            d={s.d}
            fill={fill}
            stroke={on ? '#ffffff' : GAP}
            strokeWidth={on ? 5 : 2.2}
            strokeLinejoin="round"
            onPress={muscle ? () => onSelect(muscle) : undefined}
          />
        );
      })}
    </Svg>
  );
}

export function BodyMap({
  values,
  selected,
  onSelect,
}: {
  values: Record<MuscleId, number>;
  selected: MuscleId | null;
  onSelect: (m: MuscleId) => void;
}) {
  // Açı: 0 ön, pi arka. Ara değerler dönüş sırasında görünür.
  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0);
  angleRef.current = angle;
  const width = useRef(1);
  const start = useRef(0);
  const anim = useRef<number | null>(null);

  const stop = () => {
    if (anim.current != null) cancelAnimationFrame(anim.current);
    anim.current = null;
  };

  const turnTo = (target: number) => {
    stop();
    const from = angleRef.current;
    const t0 = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - t0) / 360);
      const e = 1 - Math.pow(1 - t, 3);
      setAngle(from + (target - from) * e);
      anim.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  };

  /** Bırakınca en yakın yüze (ön ya da arka) oturur. */
  const settle = () => turnTo(Math.round(angleRef.current / Math.PI) * Math.PI);

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Yalnızca belirgin yatay sürüklemede devralır; dokunuşlar kaslara ulaşır.
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderGrant: () => {
          stop();
          start.current = angleRef.current;
        },
        onPanResponderMove: (_e, g) => setAngle(start.current + (g.dx / width.current) * Math.PI * 1.25),
        onPanResponderRelease: settle,
        onPanResponderTerminate: settle,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Web'de sürükleme doğrudan işaretçi olaylarıyla izlenir: böylece dokunuşlar kas
  // şekillerine ulaşır, yatay sürükleme ise modeli çevirir. Dikey kaydırma sayfaya kalır.
  const boxRef = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = boxRef.current as unknown as HTMLElement | null;
    if (!node || !node.addEventListener) return;
    let down = false;
    let moved = false;
    let x0 = 0;
    let a0 = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true;
      moved = false;
      x0 = e.clientX;
      a0 = angleRef.current;
      stop();
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 8) {
        moved = true;
        try {
          node.setPointerCapture(e.pointerId);
        } catch {
          // yakalama desteklenmiyorsa sürükleme yine çalışır
        }
      }
      if (moved) setAngle(a0 + (dx / width.current) * Math.PI * 1.25);
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      if (moved) settle();
    };
    // Sürüklemenin sonunda oluşan tıklama kas seçmesin.
    const onClick = (e: MouseEvent) => {
      if (!moved) return;
      moved = false;
      e.stopPropagation();
      e.preventDefault();
    };
    node.addEventListener('pointerdown', onDown);
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onUp);
    node.addEventListener('click', onClick, true);
    return () => {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      node.removeEventListener('click', onClick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cos = Math.cos(angle);
  const side: Side = cos >= 0 ? 'front' : 'back';
  const squeeze = Math.max(0.03, Math.abs(cos));
  const showingBack = Math.round(angle / Math.PI) % 2 !== 0;

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View
        ref={boxRef}
        {...(Platform.OS === 'web' ? {} : pan.panHandlers)}
        onLayout={(e) => (width.current = Math.max(1, e.nativeEvent.layout.width))}
        style={[
          { width: '100%', maxWidth: 270, aspectRatio: ASPECT },
          Platform.OS === 'web' ? ({ touchAction: 'pan-y', cursor: 'grab', userSelect: 'none' } as any) : null,
        ]}
      >
        <View style={{ flex: 1, transform: [{ scaleX: squeeze }], opacity: 0.55 + 0.45 * squeeze }}>
          <Figure side={side} values={values} selected={selected} onSelect={onSelect} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 19, padding: 3 }}>
        {(
          [
            ['Ön', false],
            ['Arka', true],
          ] as const
        ).map(([label, back]) => {
          const on = showingBack === back;
          return (
            <Pressable
              key={label}
              onPress={() => {
                // En yakın uygun yüze dön: ön için çift, arka için tek pi katı.
                const k = Math.round(angleRef.current / Math.PI);
                const isBack = k % 2 !== 0;
                turnTo((isBack === back ? k : k + 1) * Math.PI);
              }}
              style={{
                minWidth: 84,
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
    </View>
  );
}
