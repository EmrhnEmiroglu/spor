import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useDB, useExercises } from '../store';
import { useNav } from '../nav';
import { Btn, Card, Empty, Icon, IconBtn, Screen, SectionTitle, StatTile, T, useDialog } from '../ui';
import { C } from '../theme';
import { Exercise, Workout } from '../types';
import {
  MONTHS,
  buildSessions,
  e1rm,
  fmtDate,
  fmtInt,
  fmtMinutes,
  fmtNum,
  sessionsBefore,
  sortWorkouts,
  toDateStr,
  todayStr,
  workoutMuscles,
  workoutStats,
} from '../logic';
import { MUSCLE_NAME } from '../data/muscles';
import { pastWorkout } from '../actions';

const WEEKDAY_LETTERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function WorkoutRow({ w, map, onPress }: { w: Workout; map: Map<string, Exercise>; onPress: () => void }) {
  const s = workoutStats(w);
  const muscles = workoutMuscles(w, map)
    .slice(0, 4)
    .map((m) => MUSCLE_NAME[m])
    .join(', ');
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <T v="h2" numberOfLines={1}>{w.name || 'Antrenman'}</T>
          <T v="small" numberOfLines={1}>
            {fmtDate(w.date, 'full')}
            {muscles ? ` · ${muscles}` : ''}
          </T>
          <T v="tiny">
            {s.minutes != null && w.finishedAt !== w.startedAt ? `${fmtMinutes(s.minutes)} · ` : ''}
            {s.sets} set · {fmtInt(s.volume)} kg
          </T>
        </View>
        <Icon name="chevron-right" color={C.muted} />
      </View>
    </Card>
  );
}

export function HistoryTab() {
  const { db, update } = useDB();
  const nav = useNav();
  const { map } = useExercises();
  const today = todayStr();
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [sel, setSel] = useState(today);
  const [limit, setLimit] = useState(15);

  const byDate = useMemo(() => {
    const m = new Map<string, Workout[]>();
    for (const w of db.workouts) m.set(w.date, [...(m.get(w.date) ?? []), w]);
    return m;
  }, [db.workouts]);

  const sorted = useMemo(() => sortWorkouts(db.workouts).reverse(), [db.workouts]);

  const first = new Date(ym.y, ym.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: count }, (_, i) => toDateStr(new Date(ym.y, ym.m, i + 1, 12))),
  ];
  const monthPrefix = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`;
  const monthCount = db.workouts.filter((w) => w.date.startsWith(monthPrefix)).length;

  const shift = (dir: 1 | -1) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const addPast = () => {
    const w = pastWorkout(sel);
    update((d) => {
      d.workouts.push(w);
    });
    nav.push({ name: 'editor', workoutId: w.id });
  };

  const selWorkouts = byDate.get(sel) ?? [];

  return (
    <Screen title="Geçmiş">
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconBtn name="chevron-left" label="Önceki ay" onPress={() => shift(-1)} />
          <View style={{ alignItems: 'center' }}>
            <T v="h2">
              {MONTHS[ym.m]} {ym.y}
            </T>
            <T v="tiny">{monthCount} antrenman</T>
          </View>
          <IconBtn name="chevron-right" label="Sonraki ay" onPress={() => shift(1)} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAY_LETTERS.map((d) => (
            <View key={d} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
              <T v="tiny">{d}</T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((date, i) => {
            if (!date) return <View key={'b' + i} style={{ width: `${100 / 7}%`, height: 44 }} />;
            const has = byDate.has(date);
            const future = date > today;
            const isSel = date === sel;
            return (
              <Pressable
                key={date}
                disabled={future}
                onPress={() => setSel(date)}
                style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: has ? C.accent : 'transparent',
                    borderWidth: isSel ? 2 : date === today ? 1 : 0,
                    borderColor: isSel ? C.text : C.borderStrong,
                  }}
                >
                  <Text
                    style={{
                      color: has ? C.onAccent : future ? C.borderStrong : C.text2,
                      fontSize: 14,
                      fontWeight: has || isSel ? '700' : '400',
                    }}
                  >
                    {Number(date.slice(8))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionTitle>{sel === today ? 'Bugün' : fmtDate(sel, 'full')}</SectionTitle>
      {selWorkouts.map((w) => (
        <WorkoutRow key={w.id} w={w} map={map} onPress={() => nav.push({ name: 'workoutDetail', id: w.id })} />
      ))}
      {selWorkouts.length === 0 ? <T v="small">Bu günde kayıtlı antrenman yok.</T> : null}
      <Btn label="Bu güne antrenman ekle" icon="plus" kind="secondary" onPress={addPast} />

      <SectionTitle>Tüm antrenmanlar</SectionTitle>
      {sorted.length === 0 ? (
        <Empty icon="calendar" title="Henüz antrenman yok" text="Bitirdiğin her antrenman burada tarihe göre listelenir." />
      ) : null}
      {sorted.slice(0, limit).map((w) => (
        <WorkoutRow key={w.id} w={w} map={map} onPress={() => nav.push({ name: 'workoutDetail', id: w.id })} />
      ))}
      {sorted.length > limit ? <Btn label="Daha fazla göster" kind="ghost" onPress={() => setLimit((l) => l + 30)} /> : null}
    </Screen>
  );
}

export function WorkoutDetailScreen({ id }: { id: string }) {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const { map } = useExercises();
  const w = db.workouts.find((x) => x.id === id);
  const index = useMemo(() => buildSessions(db.workouts), [db.workouts]);

  if (!w) {
    return (
      <Screen title="Antrenman" onBack={nav.pop} overlay>
        {null}
      </Screen>
    );
  }

  const s = workoutStats(w);
  const timed = w.finishedAt != null && w.finishedAt !== w.startedAt;

  const remove = async () => {
    const ok = await dialog.confirm({
      title: 'Antrenman silinsin mi?',
      message: 'Bu antrenmanın tüm setleri silinir. Bu işlem geri alınamaz.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    update((d) => {
      d.workouts = d.workouts.filter((x) => x.id !== id);
    });
    nav.pop();
  };

  return (
    <Screen
      title={w.name || 'Antrenman'}
      onBack={nav.pop}
      overlay
      right={<IconBtn name="edit" label="Düzenle" onPress={() => nav.push({ name: 'editor', workoutId: id })} />}
    >
      <T v="small">{fmtDate(w.date, 'full')} · {w.date.slice(0, 4)}</T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="Süre" value={timed ? fmtMinutes(s.minutes) : '—'} />
        <StatTile label="Set" value={String(s.sets)} />
        <StatTile label="Hacim" value={fmtInt(s.volume)} unit="kg" />
      </View>

      {w.entries.map((e, ei) => {
        const before = sessionsBefore(index.get(e.exerciseId), w);
        const bestE = before.length ? Math.max(...before.map((x) => x.e1rm)) : 0;
        const bestR = before.length ? Math.max(...before.map((x) => x.bestReps)) : 0;
        const sets = e.sets.filter((x) => x.done && x.reps != null);
        if (!sets.length) return null;
        return (
          <Card key={ei} style={{ gap: 8 }} onPress={() => nav.push({ name: 'exerciseProgress', exerciseId: e.exerciseId })}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T v="h2" style={{ flex: 1 }} numberOfLines={1}>{map.get(e.exerciseId)?.name ?? 'Silinmiş egzersiz'}</T>
              <Icon name="chevron-right" color={C.muted} size={18} />
            </View>
            {sets.map((x, si) => {
              const weight = x.weight ?? 0;
              const reps = x.reps as number;
              const pr = before.length > 0 && (weight > 0 ? e1rm(weight, reps) > bestE + 0.001 : bestE === 0 && reps > bestR);
              return (
                <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 26 }}>
                  <T v="small" style={{ width: 20 }}>{si + 1}</T>
                  <T v="body" style={{ flex: 1 }}>
                    {weight > 0 ? `${fmtNum(weight)} kg × ${reps}` : `${reps} tekrar`}
                  </T>
                  {pr ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="award" size={14} color={C.warning} />
                      <T v="tiny" color={C.text2}>Rekor</T>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        );
      })}

      <Btn label="Antrenmanı sil" kind="ghost" onPress={remove} style={{ marginTop: 8 }} />
    </Screen>
  );
}
