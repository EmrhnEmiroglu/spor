import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { C } from './theme';
import { fmtNum } from './logic';

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

/**
 * Tek eksenli çizgi grafik. Parmakla dokunup sürükleyince üstteki satır
 * o noktanın değerini gösterir.
 */
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
  if (!all.length) return null;

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

  const ml = 40;
  const mr = 14;
  const mt = 10;
  const mb = 24;
  const pw = Math.max(1, w - ml - mr);
  const ph = height - mt - mb;
  const sx = (x: number) => ml + ((x - xmin) / (xmax - xmin)) * pw;
  const sy = (y: number) => mt + (1 - (y - y0) / (y1 - y0)) * ph;

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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, marginBottom: 4, gap: 8 }}>
        <Text style={{ color: C.text2, fontSize: 13 }}>{formatX(cur)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, flex: 1 }}>
          {series.map((s) => {
            const p = s.points.find((q) => q.x === cur);
            return (
              <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {multi ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} /> : null}
                {multi ? <Text style={{ color: C.text2, fontSize: 13 }}>{s.label}</Text> : null}
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{p ? `${fmtNum(p.y, 1)}${unit ? ' ' + unit : ''}` : '—'}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Svg width={w} height={height}>
            {ticks.map((t) => (
              <React.Fragment key={t}>
                <Line x1={ml} x2={w - mr} y1={sy(t)} y2={sy(t)} stroke={t === y0 ? C.borderStrong : C.border} strokeWidth={1} />
                <SvgText x={ml - 8} y={sy(t) + 4} fill={C.muted} fontSize={11} textAnchor="end">
                  {fmtNum(t)}
                </SvgText>
              </React.Fragment>
            ))}
            <SvgText x={ml} y={height - 6} fill={C.muted} fontSize={11} textAnchor="start">
              {formatX(xs[0])}
            </SvgText>
            {xs.length > 1 ? (
              <SvgText x={w - mr} y={height - 6} fill={C.muted} fontSize={11} textAnchor="end">
                {formatX(xs[xs.length - 1])}
              </SvgText>
            ) : null}
            {refLine ? (
              <>
                <Line x1={ml} x2={w - mr} y1={sy(refLine.y)} y2={sy(refLine.y)} stroke={C.text2} strokeWidth={1} />
                <SvgText x={w - mr} y={sy(refLine.y) - 5} fill={C.text2} fontSize={11} textAnchor="end">
                  {refLine.label}
                </SvgText>
              </>
            ) : null}
            <Line x1={sx(cur)} x2={sx(cur)} y1={mt} y2={mt + ph} stroke={C.borderStrong} strokeWidth={1} />
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
        <View
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
          onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        />
      </View>
    </View>
  );
}

export function Sparkline({ values, width = 64, height = 26, color = C.accent }: { values: number[]; width?: number; height?: number; color?: string }) {
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
