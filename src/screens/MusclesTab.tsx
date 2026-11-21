import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useDB, useExercises } from '../store';
import { Card, Screen, SectionTitle, Segmented, T } from '../ui';
import { C, HEAT_NONE, HEAT_STEPS, heatColor } from '../theme';
import { BodyMap } from '../body';
import { MUSCLES, MUSCLE_NAME } from '../data/muscles';
import { MuscleId } from '../types';
import { daysAgo, doneSets, fmtNum, muscleLoad, relDay } from '../logic';

type Range = '7' | '30';

export function MusclesTab() {
  const { db } = useDB();
  const { map } = useExercises();
  const [range, setRange] = useState<Range>('7');
  const [sel, setSel] = useState<MuscleId | null>(null);
  const days = Number(range);

  const load = useMemo(() => muscleLoad(db, map, days), [db, map, days]);
  const values = useMemo(() => {
    const o = {} as Record<MuscleId, number>;
    for (const m of MUSCLES) o[m.id] = load[m.id].weekly;
    return o;
  }, [load]);

  const rows = useMemo(() => [...MUSCLES].sort((a, b) => load[b.id].weekly - load[a.id].weekly), [load]);
  const scaleMax = Math.max(20, ...rows.map((r) => load[r.id].weekly));
  const untouched = rows.filter((r) => load[r.id].sets === 0).map((r) => r.name);

  // Seçili kasa bu aralıkta set yazan egzersizler.
  const contributors = useMemo(() => {
    if (!sel) return [];
    const acc = new Map<string, number>();
    const all = db.active ? [...db.workouts, db.active] : db.workouts;
    for (const w of all) {
      const ago = daysAgo(w.date);
      if (ago < 0 || ago >= days) continue;
      for (const e of w.entries) {
        const exr = map.get(e.exerciseId);
        if (!exr) continue;
        const f = exr.primary.includes(sel) ? 1 : exr.secondary.includes(sel) ? 0.5 : 0;
        const n = doneSets(e).length * f;
        if (n > 0) acc.set(exr.name, (acc.get(exr.name) ?? 0) + n);
      }
    }
    return [...acc.entries()].sort((a, b) => b[1] - a[1]);
  }, [sel, db, map, days]);

  const unit = range === '7' ? 'set' : 'set/hafta';

  return (
    <Screen title="Kas haritası">
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { key: '7', label: 'Son 7 gün' },
          { key: '30', label: 'Son 30 gün' },
        ]}
      />

      <Card style={{ gap: 14 }}>
        <BodyMap values={values} selected={sel} onSelect={(m) => setSel(sel === m ? null : m)} />
        <View style={{ gap: 6 }}>
          <T v="tiny">{range === '7' ? 'Haftalık set sayısı' : 'Haftalık ortalama set sayısı'}</T>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[{ color: HEAT_NONE, label: '0' }, ...HEAT_STEPS].map((s) => (
              <View key={s.label} style={{ flex: 1, gap: 4 }}>
                <View style={{ height: 10, borderRadius: 3, backgroundColor: s.color }} />
                <T v="tiny" style={{ textAlign: 'center', fontSize: 11 }}>{s.label}</T>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {sel ? (
        <Card style={{ gap: 6, borderColor: C.borderStrong }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T v="h2">{MUSCLE_NAME[sel]}</T>
            <T v="body" style={{ fontWeight: '600' }}>
              {fmtNum(load[sel].weekly, 1)} {unit}
            </T>
          </View>
          <T v="small">
            {load[sel].last ? `Son çalışma: ${relDay(load[sel].last as string)}` : 'Henüz çalışılmadı'}
          </T>
          {contributors.length ? (
            <View style={{ gap: 4, marginTop: 4 }}>
              {contributors.map(([name, n]) => (
                <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <T v="small" style={{ flex: 1 }} numberOfLines={1}>{name}</T>
                  <T v="small" color={C.text}>{fmtNum(n, 1)} set</T>
                </View>
              ))}
            </View>
          ) : (
            <T v="small">Bu aralıkta bu kasa set yazılmadı.</T>
          )}
        </Card>
      ) : (
        <T v="tiny" style={{ textAlign: 'center' }}>Ayrıntı için şemada bir kasa dokun.</T>
      )}

      <SectionTitle>Bölgelere göre</SectionTitle>
      <Card style={{ gap: 2, paddingVertical: 8 }}>
        {rows.map((r) => {
          const l = load[r.id];
          const on = sel === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setSel(on ? null : r.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}
            >
              <T v="small" color={on ? C.text : C.text2} style={{ width: 82, fontWeight: on ? '700' : '400' }} numberOfLines={1}>
                {r.name}
              </T>
              <View style={{ flex: 1, height: 10, justifyContent: 'center' }}>
                <View style={{ position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.border }} />
                {l.weekly > 0 ? (
                  <View
                    style={{
                      width: `${Math.max(2, (l.weekly / scaleMax) * 100)}%`,
                      height: 10,
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4,
                      backgroundColor: heatColor(l.weekly),
                    }}
                  />
                ) : null}
              </View>
              <T v="small" color={C.text} style={{ width: 34, textAlign: 'right', fontWeight: '600' }}>
                {l.weekly > 0 ? fmtNum(l.weekly, 1) : '0'}
              </T>
              <T v="tiny" style={{ width: 76, textAlign: 'right' }} numberOfLines={1}>
                {l.last ? relDay(l.last) : 'Hiç'}
              </T>
            </Pressable>
          );
        })}
      </Card>

      {untouched.length && untouched.length < MUSCLES.length ? (
        <T v="small" style={{ lineHeight: 19 }}>
          Bu aralıkta hiç çalışmayan bölgeler: {untouched.join(', ')}.
        </T>
      ) : null}
      {untouched.length === MUSCLES.length ? (
        <T v="small" style={{ lineHeight: 19 }}>
          Bu aralıkta kayıtlı set yok. Antrenman girdikçe şema renklenir. Ana kas tam set, yardımcı kas yarım set sayılır.
        </T>
      ) : null}
    </Screen>
  );
}
