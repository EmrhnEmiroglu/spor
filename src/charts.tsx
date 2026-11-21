import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { C } from './theme';
import { fmtDate, fmtNum, todayStr, weekStarts } from './logic';
import { useDB } from './store';
import { Segmented } from './ui';

/**
 * Ortak grafik çerçevesi. Bütün grafikler aynı kenar boşluklarını, eksen çizgilerini,
 * sayı biçimini ve dokunma davranışını kullanır: grafiğe dokunup sürükleyince üstteki
 * satır o noktanın değerini gösterir.
 */

// Kategori renkleri: sıra sabittir, renk körlüğü denetiminden geçmiştir.
export const SERIES = ['#3987e5', '#d95926', '#199e70'];

// Etkinlik takvimi için tek renkli sıralı ton: azdan çoğa koyudan açığa.
const ACTIVITY_STEPS = [
  { min: 1, color: '#184f95', label: '1–9' },
  { min: 10, color: '#2a78d6', label: '10–19' },
  { min: 20, color: '#6da7ec', label: '20+' },
];

const ML = 40;
const MR = 14;
const MT = 10;
const MB = 24;

function niceTicks(min: number, max: number, target = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step * 0.001; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

/** Eksen etiketleri: 10.000 ve üstü kısaltılır (12B = 12 bin). */
function fmtTick(n: number, compact: boolean): string {
  return compact ? `${fmtNum(n / 1000, 1)}B` : fmtNum(n);
}

function Readout({ left, children }: { left: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, marginBottom: 4, gap: 8 }}>
      <Text style={{ color: C.text2, fontSize: 13 }}>{left}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, flex: 1 }}>{children}</View>
    </View>
  );
}

function Value({ text }: { text: string }) {
  return <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{text}</Text>;
}

function Grid({ ticks, w, sy, compact }: { ticks: number[]; w: number; sy: (y: number) => number; compact: boolean }) {
  return (
    <>
      {ticks.map((t, i) => (
        <React.Fragment key={t}>
          <Line x1={ML} x2={w - MR} y1={sy(t)} y2={sy(t)} stroke={i === 0 ? C.borderStrong : C.border} strokeWidth={1} />
          <SvgText x={ML - 8} y={sy(t) + 4} fill={C.muted} fontSize={11} textAnchor="end">
            {fmtTick(t, compact)}
          </SvgText>
        </React.Fragment>
      ))}
    </>
  );
}

function XLabels({ w, height, first, last }: { w: number; height: number; first: string; last: string | null }) {
  return (
    <>
      <SvgText x={ML} y={height - 6} fill={C.muted} fontSize={11} textAnchor="start">
        {first}
      </SvgText>
      {last ? (
        <SvgText x={w - MR} y={height - 6} fill={C.muted} fontSize={11} textAnchor="end">
          {last}
        </SvgText>
      ) : null}
    </>
  );
}

function RefLine({ w, y, label }: { w: number; y: number; label: string }) {
  return (
    <>
      <Line x1={ML} x2={w - MR} y1={y} y2={y} stroke={C.text2} strokeWidth={1} />
      <SvgText x={w - MR} y={y - 5} fill={C.text2} fontSize={11} textAnchor="end">
        {label}
      </SvgText>
    </>
  );
}

function TouchLayer({ onPick }: { onPick: (x: number) => void }) {
  return (
    <View
      style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, { touchAction: 'pan-y' } as any]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => onPick(e.nativeEvent.locationX)}
      onResponderMove={(e) => onPick(e.nativeEvent.locationX)}
    />
  );
}

export function ChartEmpty({ text }: { text: string }) {
  return (
    <View style={{ minHeight: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
      <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

// ---------- Çizgi grafik ----------

export interface Pt {
  x: number;
  y: number;
}

export interface Series {
  key: string;
  label: string;
  color: string;
  points: Pt[];
  style?: 'line' | 'dots';
}

export function LineChart({
  series,
  height = 190,
  unit = '',
  formatX,
  refLine,
}: {
  series: Series[];
  height?: number;
  unit?: string;
  formatX: (x: number) => string;
  /** Hedef gibi sabit bir değeri gösteren yatay çizgi. */
  refLine?: { y: number; label: string };
}) {
  const [w, setW] = useState(0);
  const [activeX, setActiveX] = useState<number | null>(null);

  const all = series.flatMap((s) => s.points);
  if (!all.length) return <ChartEmpty text="Bu aralıkta kayıt yok." />;

  const xs = Array.from(new Set(all.map((p) => p.x))).sort((a, b) => a - b);
  let xmin = xs[0];
  let xmax = xs[xs.length - 1];
  if (xmin === xmax) {
    xmin -= 1;
    xmax += 1;
  }
  const ys = all.map((p) => p.y);
  if (refLine) ys.push(refLine.y);
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const compact = y1 >= 10000;

  const pw = Math.max(1, w - ML - MR);
  const ph = height - MT - MB;
  const sx = (x: number) => ML + ((x - xmin) / (xmax - xmin)) * pw;
  const sy = (y: number) => MT + (1 - (y - y0) / (y1 - y0)) * ph;

  const cur = activeX != null && xs.includes(activeX) ? activeX : xs[xs.length - 1];

  const pick = (px: number) => {
    let best = xs[0];
    let bestD = Infinity;
    for (const x of xs) {
      const d = Math.abs(sx(x) - px);
      if (d < bestD) {
        bestD = d;
        best = x;
      }
    }
    setActiveX(best);
  };

  const multi = series.length > 1;

  return (
    <View>
      <Readout left={formatX(cur)}>
        {series.map((s) => {
          const p = s.points.find((q) => q.x === cur);
          return (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {multi ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} /> : null}
              {multi ? <Text style={{ color: C.text2, fontSize: 13 }}>{s.label}</Text> : null}
              <Value text={p ? `${fmtNum(p.y, 1)}${unit ? ' ' + unit : ''}` : '—'} />
            </View>
          );
        })}
      </Readout>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Svg width={w} height={height}>
            <Grid ticks={ticks} w={w} sy={sy} compact={compact} />
            <XLabels w={w} height={height} first={formatX(xs[0])} last={xs.length > 1 ? formatX(xs[xs.length - 1]) : null} />
            {refLine ? <RefLine w={w} y={sy(refLine.y)} label={refLine.label} /> : null}
            <Line x1={sx(cur)} x2={sx(cur)} y1={MT} y2={MT + ph} stroke={C.borderStrong} strokeWidth={1} />
            {series.map((s) => {
              const pts = [...s.points].sort((a, b) => a.x - b.x);
              if (s.style === 'dots') {
                return pts.map((p, i) => <Circle key={s.key + i} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={s.color} />);
              }
              const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
              const area = pts.length > 1 ? `${d} L${sx(pts[pts.length - 1].x).toFixed(1)} ${sy(y0)} L${sx(pts[0].x).toFixed(1)} ${sy(y0)} Z` : '';
              const lastPt = pts[pts.length - 1];
              return (
                <React.Fragment key={s.key}>
                  {area && !multi ? <Path d={area} fill={s.color} opacity={0.1} /> : null}
                  {pts.length > 1 ? <Path d={d} stroke={s.color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
                  {pts.length <= 24
                    ? pts.map((p, i) => <Circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={s.color} stroke={C.surface} strokeWidth={1.5} />)
                    : null}
                  <Circle cx={sx(lastPt.x)} cy={sy(lastPt.y)} r={4.5} fill={s.color} stroke={C.surface} strokeWidth={2} />
                </React.Fragment>
              );
            })}
            {series.map((s) => {
              const p = s.points.find((q) => q.x === cur);
              if (!p || activeX == null) return null;
              return <Circle key={'a' + s.key} cx={sx(p.x)} cy={sy(p.y)} r={6} fill={s.color} stroke={C.text} strokeWidth={2} />;
            })}
          </Svg>
        ) : null}
        <TouchLayer onPick={pick} />
      </View>
    </View>
  );
}

// ---------- Çubuk grafik ----------

export interface Bar {
  key: string;
  /** Üst satırda ve eksende görünen ad, ör. "16–22 Kas". */
  label: string;
  y: number;
}

/** Sıfırdan başlayan çubuk grafik. Haftalık toplamlar için kullanılır. */
export function BarChart({
  bars,
  height = 170,
  unit = '',
  color = SERIES[0],
  refLine,
  band,
  decimals = 1,
}: {
  bars: Bar[];
  height?: number;
  unit?: string;
  color?: string;
  refLine?: { y: number; label: string };
  /** Hedef aralığı: çubukların arkasında yatay bant. */
  band?: { min: number; max: number; label: string };
  decimals?: number;
}) {
  const [w, setW] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  if (!bars.length) return <ChartEmpty text="Bu aralıkta kayıt yok." />;

  const tops = bars.map((b) => b.y);
  if (refLine) tops.push(refLine.y);
  if (band) tops.push(band.max);
  const ticks = niceTicks(0, Math.max(1, ...tops));
  const y1 = ticks[ticks.length - 1];
  const compact = y1 >= 10000;

  const pw = Math.max(1, w - ML - MR);
  const ph = height - MT - MB;
  const slot = pw / bars.length;
  const bw = Math.max(2, Math.min(24, slot - 2));
  const cx = (i: number) => ML + slot * (i + 0.5);
  const sy = (y: number) => MT + (1 - y / y1) * ph;
  const base = sy(0);

  const cur = active != null && active < bars.length ? active : bars.length - 1;
  const pick = (px: number) => setActive(Math.max(0, Math.min(bars.length - 1, Math.floor((px - ML) / slot))));
  const show = (n: number) => (compact ? fmtNum(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : fmtNum(n, decimals));

  return (
    <View>
      <Readout left={bars[cur].label}>
        <Value text={`${show(bars[cur].y)}${unit ? ' ' + unit : ''}`} />
      </Readout>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Svg width={w} height={height}>
            {band ? (
              <>
                <Rect x={ML} y={sy(band.max)} width={pw} height={Math.max(1, sy(band.min) - sy(band.max))} fill={C.surface3} />
              </>
            ) : null}
            <Grid ticks={ticks} w={w} sy={sy} compact={compact} />
            <XLabels w={w} height={height} first={bars[0].label} last={bars.length > 1 ? bars[bars.length - 1].label : null} />
            {bars.map((b, i) => {
              if (b.y <= 0) return null;
              const top = sy(b.y);
              const h = base - top;
              const r = Math.min(4, bw / 2, h);
              const x0 = cx(i) - bw / 2;
              const d = `M${x0} ${base} L${x0} ${top + r} Q${x0} ${top} ${x0 + r} ${top} L${x0 + bw - r} ${top} Q${x0 + bw} ${top} ${x0 + bw} ${top + r} L${x0 + bw} ${base} Z`;
              return <Path key={b.key} d={d} fill={color} opacity={i === cur ? 1 : 0.55} />;
            })}
            {refLine ? <RefLine w={w} y={sy(refLine.y)} label={refLine.label} /> : null}
          </Svg>
        ) : null}
        <TouchLayer onPick={pick} />
      </View>
      {band ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <View style={{ width: 14, height: 10, borderRadius: 2, backgroundColor: C.surface3, borderWidth: 1, borderColor: C.borderStrong }} />
          <Text style={{ color: C.text2, fontSize: 12 }}>{band.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------- Küçük eğilim çizgisi ----------

export function Sparkline({ values, width = 64, height = 26, color = SERIES[0] }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const sx = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const sy = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={C.muted} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={sx(values.length - 1)} cy={sy(values[values.length - 1])} r={3} fill={color} />
    </Svg>
  );
}

// ---------- Bütünün parçaları ----------

/** Bir toplamın parçalara dağılımı: tek şerit ve altında oranlar. */
export function PartsBar({ parts, unit = 'set' }: { parts: { label: string; value: number }[]; unit?: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (total <= 0) return <Text style={{ color: C.muted, fontSize: 13 }}>Bu aralıkta veri yok.</Text>;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', height: 14, gap: 2 }}>
        {parts.map((p, i) =>
          p.value > 0 ? (
            <View
              key={p.label}
              style={{
                flex: p.value,
                backgroundColor: SERIES[i % SERIES.length],
                borderTopLeftRadius: i === 0 ? 4 : 0,
                borderBottomLeftRadius: i === 0 ? 4 : 0,
                borderTopRightRadius: i === parts.length - 1 ? 4 : 0,
                borderBottomRightRadius: i === parts.length - 1 ? 4 : 0,
              }}
            />
          ) : null,
        )}
      </View>
      <View style={{ gap: 6 }}>
        {parts.map((p, i) => (
          <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: SERIES[i % SERIES.length] }} />
            <Text style={{ color: C.text2, fontSize: 13, flex: 1 }}>{p.label}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {fmtNum(p.value, 1)} {unit}
            </Text>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '600', width: 42, textAlign: 'right' }}>
              %{Math.round((p.value / total) * 100)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- Etkinlik takvimi ----------

const DAY_LABELS = ['Pzt', '', 'Çar', '', 'Cum', '', 'Paz'];

function activityColor(sets: number): string {
  let c = C.surface3;
  for (const s of ACTIVITY_STEPS) if (sets >= s.min) c = s.color;
  return c;
}

/** Haftalar sütun, günler satır. Her kare o günün set sayısına göre boyanır. */
export function CalendarGrid({ values, weeks }: { values: Map<string, number>; weeks: number }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const starts = weekStarts(weeks);
  const today = todayStr();
  const labelW = 28;
  const gap = weeks > 26 ? 1 : 2;
  const cell = w > 0 ? Math.max(3, Math.min(18, (w - labelW - gap * (weeks - 1)) / weeks)) : 0;
  const gridW = cell * weeks + gap * (weeks - 1);
  const gridH = cell * 7 + gap * 6;

  const dateAt = (col: number, row: number): string => {
    const d = new Date(starts[col] + 'T12:00:00');
    d.setDate(d.getDate() + row);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const pick = (x: number, y: number) => {
    const col = Math.floor((x - labelW) / (cell + gap));
    const row = Math.floor(y / (cell + gap));
    if (col < 0 || col >= weeks || row < 0 || row > 6) return;
    const d = dateAt(col, row);
    if (d <= today) setSel(d);
  };

  const shown = sel ?? today;
  const count = values.get(shown) ?? 0;

  return (
    <View>
      <Readout left={shown === today ? 'Bugün' : fmtDate(shown, 'full')}>
        <Value text={count > 0 ? `${count} set` : 'Antrenman yok'} />
      </Readout>
      <View style={{ height: gridH || 60 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Svg width={w} height={gridH}>
            {DAY_LABELS.map((l, row) =>
              l ? (
                <SvgText key={row} x={0} y={row * (cell + gap) + cell / 2 + 4} fill={C.muted} fontSize={10}>
                  {l}
                </SvgText>
              ) : null,
            )}
            {starts.map((_, col) =>
              [0, 1, 2, 3, 4, 5, 6].map((row) => {
                const d = dateAt(col, row);
                if (d > today) return null;
                return (
                  <Rect
                    key={d}
                    x={labelW + col * (cell + gap)}
                    y={row * (cell + gap)}
                    width={cell}
                    height={cell}
                    rx={Math.min(3, cell / 3)}
                    fill={activityColor(values.get(d) ?? 0)}
                    stroke={d === shown ? C.text : 'none'}
                    strokeWidth={d === shown ? 1.5 : 0}
                  />
                );
              }),
            )}
          </Svg>
        ) : null}
        <View
          style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: labelW + gridW }, { touchAction: 'pan-y' } as any]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          onResponderMove={(e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <Text style={{ color: C.muted, fontSize: 12 }}>Günlük set:</Text>
        {[{ color: C.surface3, label: '0' }, ...ACTIVITY_STEPS].map((s) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: s.color }} />
            <Text style={{ color: C.text2, fontSize: 12 }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- Ortak aralık seçici ----------

const RANGES: { key: string; label: string }[] = [
  { key: '4', label: '4 hafta' },
  { key: '12', label: '12 hafta' },
  { key: '26', label: '6 ay' },
  { key: '52', label: '1 yıl' },
];

/** Seçili aralığın hafta sayısı. Seçim bütün ekranlarda ortaktır. */
export function useRangeWeeks(): number {
  const { db } = useDB();
  const n = db.settings.statsRange;
  return [4, 12, 26, 52].includes(n) ? n : 12;
}

/** Seçili aralığın ilk günü (bir pazartesi). */
export function useRangeStart(): string {
  return weekStarts(useRangeWeeks())[0];
}

export function RangePicker() {
  const { update } = useDB();
  const weeks = useRangeWeeks();
  return (
    <Segmented options={RANGES} value={String(weeks)} onChange={(k) => update((d) => void (d.settings.statsRange = Number(k)))} />
  );
}
