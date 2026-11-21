import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDB, useExercises } from '../store';
import { useNav } from '../nav';
import { Card, Empty, Icon, Screen, SectionTitle, Segmented, StatTile, T } from '../ui';
import { C } from '../theme';
import { BarChart, CalendarGrid, PartsBar, RangePicker, useRangeStart, useRangeWeeks } from '../charts';
import { ExerciseList, METRIC_LABEL, METRIC_UNIT } from './ProgressTab';
import {
  balances,
  buildSessions,
  dailySets,
  fmtDate,
  fmtInt,
  fmtNum,
  fmtWeek,
  muscleWeeklySeries,
  recordRows,
  weeklySeries,
} from '../logic';
import { MUSCLES } from '../data/muscles';
import { MuscleId } from '../types';

type Section = 'general' | 'exercises';
type WeekMetric = 'sets' | 'volume' | 'workouts';

const WEEK_METRIC: Record<WeekMetric, { label: string; unit: string }> = {
  sets: { label: 'Set', unit: 'set' },
  volume: { label: 'Hacim', unit: 'kg' },
  workouts: { label: 'Antrenman', unit: 'antrenman' },
};

function General() {
  const { db } = useDB();
  const nav = useNav();
  const { map } = useExercises();
  const weeks = useRangeWeeks();
  const from = useRangeStart();
  const [metric, setMetric] = useState<WeekMetric>('sets');

  const series = useMemo(() => weeklySeries(db, weeks), [db, weeks]);
  const total = useMemo(
    () => series.reduce((a, p) => ({ workouts: a.workouts + p.workouts, sets: a.sets + p.sets, volume: a.volume + p.volume }), { workouts: 0, sets: 0, volume: 0 }),
    [series],
  );

  const perMuscle = useMemo(() => {
    const s = muscleWeeklySeries(db, map, weeks);
    const o = {} as Record<MuscleId, number>;
    for (const m of MUSCLES) o[m.id] = s[m.id].reduce((a, v) => a + v, 0);
    return o;
  }, [db, map, weeks]);

  const daily = useMemo(() => dailySets(db), [db]);
  const index = useMemo(() => buildSessions(db.workouts), [db.workouts]);
  const records = useMemo(() => recordRows(index, from), [index, from]);
  const prCount = records.reduce((a, r) => a + r.prs, 0);
  const recent = records.filter((r) => r.prs > 0);

  if (db.workouts.length === 0) {
    return (
      <Empty
        icon="trend"
        title="Henüz veri yok"
        text="İlk antrenmanını bitirdiğinde haftalık hacim, denge ve rekor grafikleri burada oluşur."
      />
    );
  }

  return (
    <>
      <RangePicker />
      <T v="tiny" style={{ textAlign: 'center' }}>
        {fmtDate(from, 'long')} tarihinden bugüne. Haftalar Pazartesi başlar.
      </T>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="Antrenman" value={String(total.workouts)} sub={`haftada ${fmtNum(total.workouts / weeks, 1)}`} />
        <StatTile label="Set" value={fmtInt(total.sets)} sub={`haftada ${fmtNum(total.sets / weeks, 0)}`} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="Hacim" value={fmtNum(total.volume / 1000, 1)} unit="ton" sub="kaldırılan toplam kilo" />
        <StatTile label="Rekor" value={String(prCount)} sub={`${recent.length} egzersizde`} />
      </View>

      <SectionTitle>Haftalık toplam</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Segmented
          value={metric}
          onChange={setMetric}
          options={[
            { key: 'sets', label: 'Set' },
            { key: 'volume', label: 'Hacim' },
            { key: 'workouts', label: 'Antrenman' },
          ]}
        />
        <BarChart
          bars={series.map((p) => ({ key: p.start, label: fmtWeek(p.start), y: p[metric] }))}
          unit={WEEK_METRIC[metric].unit}
          decimals={0}
          refLine={metric === 'workouts' ? { y: db.settings.weeklyGoal, label: `Hedef ${db.settings.weeklyGoal}` } : undefined}
        />
        <T v="tiny">En sağdaki çubuk içinde bulunduğun haftadır ve henüz tamamlanmamış olabilir.</T>
      </Card>

      <SectionTitle>Düzen</SectionTitle>
      <Card>
        <CalendarGrid values={daily} weeks={weeks} />
      </Card>

      <SectionTitle>Denge</SectionTitle>
      <Card style={{ gap: 18 }}>
        {balances(perMuscle).map((b) => (
          <View key={b.title} style={{ gap: 8 }}>
            <T v="body" style={{ fontWeight: '600' }}>{b.title}</T>
            <PartsBar parts={b.parts} />
            <T v="tiny">{b.note}</T>
          </View>
        ))}
        <T v="tiny" style={{ lineHeight: 17 }}>
          Oranlar seçili aralıktaki set sayılarından hesaplanır. Ana kas tam set, yardımcı kas yarım set sayılır.
        </T>
      </Card>

      <SectionTitle>Bu aralıkta kırılan rekorlar</SectionTitle>
      {recent.length === 0 ? (
        <T v="small">Bu aralıkta yeni rekor yok. Aralığı genişletmeyi dene.</T>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {recent.map((r) => (
            <Card
              key={r.exerciseId}
              onPress={() => nav.push({ name: 'exerciseProgress', exerciseId: r.exerciseId })}
              style={{ backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 10, borderRadius: 0 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="award" size={18} color={C.warning} />
                <View style={{ flex: 1 }}>
                  <T v="body" style={{ fontWeight: '600' }} numberOfLines={1}>{map.get(r.exerciseId)?.name ?? 'Silinmiş egzersiz'}</T>
                  <T v="tiny" style={{ marginTop: 2 }}>
                    {METRIC_LABEL[r.metric]} · {fmtDate(r.bestDate, 'long')} · {r.prs} rekor
                  </T>
                </View>
                <T v="body" style={{ fontWeight: '600' }}>
                  {fmtNum(r.best, 1)} {METRIC_UNIT[r.metric]}
                </T>
              </View>
            </Card>
          ))}
        </Card>
      )}
    </>
  );
}

export function StatsTab() {
  const [section, setSection] = useState<Section>('general');
  return (
    <Screen title="İstatistik">
      <Segmented
        value={section}
        onChange={setSection}
        options={[
          { key: 'general', label: 'Genel' },
          { key: 'exercises', label: 'Egzersizler' },
        ]}
      />
      {section === 'general' ? <General /> : <ExerciseList />}
    </Screen>
  );
}
