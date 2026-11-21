import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDB, useExercises } from '../store';
import { useNav } from '../nav';
import { Card, Chip, Empty, Field, Icon, Screen, SectionTitle, Segmented, StatTile, T, Tag } from '../ui';
import { C } from '../theme';
import { LineChart, Sparkline } from '../charts';
import {
  Metric,
  Session,
  buildSessions,
  dayNumber,
  fmtDate,
  fmtDayNumber,
  fmtInt,
  fmtNum,
  fmtSets,
  isStalled,
  mainMetric,
  metricOf,
  relDay,
  suggest,
} from '../logic';
import { MUSCLE_NAME } from '../data/muscles';

const METRIC_LABEL: Record<Metric, string> = {
  e1rm: 'Tahmini 1RM',
  top: 'En ağır set',
  volume: 'Hacim',
  reps: 'En iyi tekrar',
};
const METRIC_UNIT: Record<Metric, string> = { e1rm: 'kg', top: 'kg', volume: 'kg', reps: 'tekrar' };

function Delta({ value, unit }: { value: number; unit: string }) {
  if (Math.abs(value) < 0.05) return <T v="tiny">Değişim yok</T>;
  const up = value > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon name={up ? 'arrow-up' : 'arrow-down'} size={12} color={up ? C.good : C.critical} width={2.5} />
      <T v="tiny" color={C.text2}>
        {fmtNum(Math.abs(value), 1)} {unit}
      </T>
    </View>
  );
}

export function ProgressTab() {
  const { db } = useDB();
  const nav = useNav();
  const { map } = useExercises();
  const index = useMemo(() => buildSessions(db.workouts), [db.workouts]);

  const rows = useMemo(() => {
    const out: { id: string; name: string; sessions: Session[] }[] = [];
    for (const [id, sessions] of index) {
      out.push({ id, name: map.get(id)?.name ?? 'Silinmiş egzersiz', sessions });
    }
    return out.sort((a, b) => {
      const la = a.sessions[a.sessions.length - 1].date;
      const lb = b.sessions[b.sessions.length - 1].date;
      return la === lb ? a.name.localeCompare(b.name, 'tr') : la < lb ? 1 : -1;
    });
  }, [index, map]);

  return (
    <Screen title="İlerleme">
      {rows.length === 0 ? (
        <Empty
          icon="trend"
          title="Henüz veri yok"
          text="Antrenman kaydettikçe her egzersizin kuvvet ve hacim grafiği burada oluşur."
        />
      ) : (
        <T v="small">Egzersize dokununca grafik ve geçmiş açılır.</T>
      )}
      {rows.map((r) => {
        const m = mainMetric(r.sessions);
        const vals = r.sessions.map((s) => metricOf(s, m));
        const lastV = vals[vals.length - 1];
        const prevV = vals.length > 1 ? vals[vals.length - 2] : null;
        return (
          <Card key={r.id} onPress={() => nav.push({ name: 'exerciseProgress', exerciseId: r.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T v="h2" style={{ flexShrink: 1 }} numberOfLines={1}>{r.name}</T>
                  {isStalled(r.sessions) ? <Tag label="DURAKLADI" color={C.bg} bg={C.warning} /> : null}
                </View>
                <T v="small" numberOfLines={1}>
                  {METRIC_LABEL[m]}: {fmtNum(lastV, 1)} {METRIC_UNIT[m]}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T v="tiny">{relDay(r.sessions[r.sessions.length - 1].date)}</T>
                  {prevV != null ? <Delta value={lastV - prevV} unit={METRIC_UNIT[m]} /> : null}
                </View>
              </View>
              <Sparkline values={vals.slice(-10)} />
              <Icon name="chevron-right" color={C.muted} size={18} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

export function ExerciseProgressScreen({ exerciseId }: { exerciseId: string }) {
  const { db, update } = useDB();
  const nav = useNav();
  const { map } = useExercises();
  const exr = map.get(exerciseId);
  const sessions = useMemo(() => buildSessions(db.workouts).get(exerciseId) ?? [], [db.workouts, exerciseId]);
  const weighted = sessions.some((s) => s.weighted);
  const [metricSel, setMetricSel] = useState<Metric>('e1rm');
  const metric: Metric = weighted ? metricSel : 'reps';

  // Tekrar aralığı: egzersizin en son kullanıldığı antrenmandaki aralık.
  const range = useMemo(() => {
    let best: { date: string; t: number; repMin: number; repMax: number } | null = null;
    for (const w of db.workouts) {
      for (const e of w.entries) {
        if (e.exerciseId !== exerciseId) continue;
        if (!best || w.date > best.date || (w.date === best.date && w.startedAt > best.t)) {
          best = { date: w.date, t: w.startedAt, repMin: e.repMin, repMax: e.repMax };
        }
      }
    }
    return best ?? { repMin: 8, repMax: 12 };
  }, [db.workouts, exerciseId]);

  const title = exr?.name ?? 'Silinmiş egzersiz';

  if (!sessions.length) {
    return (
      <Screen title={title} onBack={nav.pop} overlay>
        <Empty icon="trend" title="Henüz kayıt yok" text="Bu egzersizle ilk antrenmanını bitirdiğinde grafik burada başlar." />
      </Screen>
    );
  }

  const vals = sessions.map((s) => metricOf(s, metric));
  const best = Math.max(...vals);
  const bestSession = sessions[vals.indexOf(best)];
  const lastS = sessions[sessions.length - 1];
  const hint = suggest(lastS, range.repMin, range.repMax, db.settings.increment);
  const stalled = isStalled(sessions);
  const unit = METRIC_UNIT[metric];
  const big = (n: number) => (metric === 'volume' ? fmtInt(n) : fmtNum(n, 1));

  return (
    <Screen title={title} onBack={nav.pop} overlay>
      {exr ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {exr.primary.map((m) => (
            <Chip key={m} label={MUSCLE_NAME[m]} selected />
          ))}
          {exr.secondary.map((m) => (
            <Chip key={m} label={MUSCLE_NAME[m]} />
          ))}
        </View>
      ) : null}

      {weighted ? (
        <Segmented
          value={metricSel}
          onChange={setMetricSel}
          options={[
            { key: 'e1rm', label: 'Tahmini 1RM' },
            { key: 'top', label: 'En ağır' },
            { key: 'volume', label: 'Hacim' },
          ]}
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="Rekor" value={big(best)} unit={unit} sub={fmtDate(bestSession.date)} />
        <StatTile label="Son" value={big(vals[vals.length - 1])} unit={unit} sub={relDay(lastS.date)} />
        <StatTile label="Seans" value={String(sessions.length)} />
      </View>

      <Card>
        <T v="label" style={{ marginBottom: 6 }}>{METRIC_LABEL[metric]}</T>
        <LineChart
          unit={unit}
          formatX={fmtDayNumber}
          series={[
            {
              key: metric,
              label: METRIC_LABEL[metric],
              color: C.accent,
              points: sessions.map((s) => ({ x: dayNumber(s.date), y: metricOf(s, metric) })),
            },
          ]}
        />
        {metric === 'e1rm' ? (
          <T v="tiny" style={{ marginTop: 8, lineHeight: 17 }}>
            Tahmini 1RM, en iyi setinden hesaplanan tek tekrarlık en yüksek kilodur. Kilo ya da tekrar artınca yükselir.
          </T>
        ) : null}
      </Card>

      {hint ? (
        <Card style={{ gap: 6 }}>
          <T v="label">Sıradaki hedef</T>
          <T v="body" style={{ lineHeight: 21 }}>{hint.text}</T>
          <T v="tiny">
            Tekrar aralığı {range.repMin}–{range.repMax}. Aralığı antrenman sırasında egzersizin seçeneklerinden değiştirebilirsin.
          </T>
        </Card>
      ) : null}

      {stalled ? (
        <Card style={{ gap: 6, flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ marginTop: 2 }}>
            <Icon name="info" size={18} color={C.warning} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="body" style={{ fontWeight: '600' }}>Son 3 seansta rekor gelmedi</T>
            <T v="small" style={{ lineHeight: 19 }}>
              Dinlenme süresini uzatmayı, set sayısını değiştirmeyi ya da bir hafta kiloyu düşürüp yeniden çıkmayı deneyebilirsin.
            </T>
          </View>
        </Card>
      ) : null}

      <Card style={{ gap: 8 }}>
        <T v="label">Not</T>
        <Field
          value={db.exerciseNotes[exerciseId] ?? ''}
          onChangeText={(t) =>
            update((d) => {
              if (t.trim()) d.exerciseNotes[exerciseId] = t;
              else delete d.exerciseNotes[exerciseId];
            })
          }
          placeholder="Koltuk ayarı, tutuş, dikkat edilecekler"
          multiline
        />
        <T v="tiny">Bu not her antrenmanda egzersizin altında görünür.</T>
      </Card>

      <SectionTitle>Seans geçmişi</SectionTitle>
      {[...sessions].reverse().map((s) => (
        <Card key={s.workoutId} onPress={() => nav.push({ name: 'workoutDetail', id: s.workoutId })} style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <T v="body" style={{ fontWeight: '600' }}>{fmtDate(s.date, 'long')}</T>
            <T v="small" color={C.text}>
              {s.weighted ? `${fmtNum(s.e1rm, 1)} kg` : `${s.bestReps} tekrar`}
            </T>
          </View>
          <T v="small">{fmtSets(s.sets)}</T>
        </Card>
      ))}
    </Screen>
  );
}
