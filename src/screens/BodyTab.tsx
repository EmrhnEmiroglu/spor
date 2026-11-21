import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDB } from '../store';
import { Btn, Card, Chip, DatePicker, Empty, IconBtn, NumInput, Screen, SectionTitle, Segmented, StatTile, T, useDialog } from '../ui';
import { C } from '../theme';
import { LineChart } from '../charts';
import { MEASURES } from '../data/muscles';
import { MeasureId } from '../types';
import { addDays, dayNumber, daysAgo, fmtDate, fmtDayNumber, fmtNum, movingAverage, relDay, todayStr, trendPerDay } from '../logic';

function signed(n: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtNum(Math.abs(n), 1)}`;
}

function WeightSection() {
  const { db, update } = useDB();
  const dialog = useDialog();
  const [date, setDate] = useState(todayStr());
  const [kg, setKg] = useState<number | null>(null);
  const [limit, setLimit] = useState(7);

  const logs = useMemo(() => [...db.weights].sort((a, b) => (a.date < b.date ? -1 : 1)), [db.weights]);
  const avg = useMemo(() => movingAverage(logs.map((l) => ({ date: l.date, value: l.kg }))), [logs]);

  const save = () => {
    if (kg == null || kg <= 0) return dialog.toast('Kilonu gir.');
    update((d) => {
      d.weights = d.weights.filter((x) => x.date !== date);
      d.weights.push({ date, kg });
    });
    setKg(null);
    dialog.toast('Kilo kaydedildi.');
  };

  const latest = logs[logs.length - 1];
  const latestAvg = avg[avg.length - 1];
  // 30 gün önceki ortalamaya en yakın kayıt.
  const past = [...avg].reverse().find((p) => daysAgo(p.date) >= 28);
  const change = latestAvg && past ? latestAvg.value - past.value : null;

  const goal = db.settings.goalWeight;
  const slope = useMemo(() => trendPerDay(avg), [avg]);
  const remaining = goal != null && latestAvg ? goal - latestAvg.value : null;
  const goalText = (() => {
    if (remaining == null) return null;
    if (Math.abs(remaining) < 0.2) return 'Hedefe ulaştın.';
    if (slope == null) return 'Tahmin için en az bir haftaya yayılmış üç tartı gerekli.';
    const weekly = slope * 7;
    if (Math.abs(weekly) < 0.03 || slope * remaining <= 0) {
      return `Son haftalardaki gidiş hedefe doğru değil. Haftalık değişim ${signed(weekly)} kg.`;
    }
    const days = Math.ceil(remaining / slope);
    if (days > 730) return `Haftalık değişim ${signed(weekly)} kg. Bu hızla hedef iki yıldan uzun sürer.`;
    return `Haftalık değişim ${signed(weekly)} kg. Bu hızla tahmini varış ${fmtDate(addDays(todayStr(), days), 'long')}.`;
  })();

  return (
    <>
      <Card style={{ gap: 10 }}>
        <DatePicker date={date} onChange={setDate} />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <NumInput value={kg} onChange={setKg} placeholder={latest ? fmtNum(latest.kg, 1) : 'Kilo'} style={{ flex: 1 }} />
          <T v="small">kg</T>
          <Btn label="Kaydet" onPress={save} style={{ minWidth: 110 }} />
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T v="label" style={{ flex: 1 }}>Hedef kilo</T>
          <NumInput
            value={goal}
            onChange={(n) => update((d) => void (d.settings.goalWeight = n != null && n > 0 ? n : null))}
            placeholder="Yok"
            style={{ width: 96 }}
          />
          <T v="small">kg</T>
        </View>
        {remaining != null && Math.abs(remaining) >= 0.2 ? (
          <T v="body" style={{ fontWeight: '600' }}>Hedefe {fmtNum(Math.abs(remaining), 1)} kg kaldı</T>
        ) : null}
        {goalText ? <T v="small" style={{ lineHeight: 19 }}>{goalText}</T> : null}
        {goal == null ? <T v="tiny">Hedef girersen mevcut gidişle tahmini varış tarihi hesaplanır.</T> : null}
      </Card>

      {logs.length === 0 ? (
        <Empty icon="user" title="Henüz kilo kaydı yok" text="Her sabah aynı koşulda tartılıp girersen eğilim çizgisi daha doğru olur." />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatTile label="Son tartı" value={fmtNum(latest.kg, 1)} unit="kg" sub={relDay(latest.date)} />
            <StatTile label="7 gün ort." value={fmtNum(latestAvg.value, 1)} unit="kg" />
            <StatTile label="30 günde" value={change == null ? '—' : signed(change)} unit={change == null ? undefined : 'kg'} />
          </View>
          <Card>
            <LineChart
              unit="kg"
              formatX={fmtDayNumber}
              refLine={goal != null && goal >= 30 ? { y: goal, label: `Hedef ${fmtNum(goal, 1)}` } : undefined}
              series={[
                {
                  key: 'avg',
                  label: '7 gün ort.',
                  color: C.accent,
                  points: avg.map((p) => ({ x: dayNumber(p.date), y: p.value })),
                },
                {
                  key: 'raw',
                  label: 'Tartı',
                  color: C.muted,
                  style: 'dots',
                  points: logs.map((l) => ({ x: dayNumber(l.date), y: l.kg })),
                },
              ]}
            />
          </Card>
          <SectionTitle>Kayıtlar</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {[...logs]
              .reverse()
              .slice(0, limit)
              .map((l) => (
                <View key={l.date} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
                  <T v="body" style={{ flex: 1 }}>{fmtDate(l.date, 'long')}</T>
                  <T v="body" style={{ fontWeight: '600' }}>{fmtNum(l.kg, 1)} kg</T>
                  <IconBtn
                    name="x"
                    label="Kaydı sil"
                    size={16}
                    onPress={() => update((d) => void (d.weights = d.weights.filter((x) => x.date !== l.date)))}
                  />
                </View>
              ))}
          </Card>
          {logs.length > limit ? <Btn label="Daha fazla göster" kind="ghost" onPress={() => setLimit((n) => n + 30)} /> : null}
        </>
      )}
    </>
  );
}

function MeasureSection() {
  const { db, update } = useDB();
  const dialog = useDialog();
  const [date, setDate] = useState(todayStr());
  const [draft, setDraft] = useState<Partial<Record<MeasureId, number | null>>>({});
  const [sel, setSel] = useState<MeasureId>('waist');
  const [formKey, setFormKey] = useState(0);

  const logs = useMemo(() => [...db.measures].sort((a, b) => (a.date < b.date ? -1 : 1)), [db.measures]);

  const latestOf = (id: MeasureId) => [...logs].reverse().find((l) => l.values[id] != null)?.values[id];

  const save = () => {
    const filled = Object.entries(draft).filter(([, v]) => v != null && (v as number) > 0) as [MeasureId, number][];
    if (!filled.length) return dialog.toast('En az bir ölçü gir.');
    update((d) => {
      let log = d.measures.find((x) => x.date === date);
      if (!log) {
        log = { date, values: {} };
        d.measures.push(log);
      }
      for (const [id, v] of filled) log.values[id] = v;
    });
    setDraft({});
    setFormKey((k) => k + 1);
    dialog.toast('Ölçüler kaydedildi.');
  };

  const series = logs.filter((l) => l.values[sel] != null).map((l) => ({ date: l.date, value: l.values[sel] as number }));
  const firstV = series[0]?.value;
  const lastV = series[series.length - 1]?.value;
  const selName = MEASURES.find((m) => m.id === sel)?.name ?? '';

  return (
    <>
      <Card style={{ gap: 10 }}>
        <DatePicker date={date} onChange={setDate} />
        <T v="tiny">Santimetre olarak gir. Boş bıraktıkların kaydedilmez.</T>
        <View key={formKey} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {MEASURES.map((m) => {
            const prev = latestOf(m.id);
            return (
              <View key={m.id} style={{ width: '30.5%', flexGrow: 1, gap: 4 }}>
                <T v="tiny">{m.name}</T>
                <NumInput
                  value={draft[m.id] ?? null}
                  onChange={(n) => setDraft((d) => ({ ...d, [m.id]: n }))}
                  placeholder={prev != null ? fmtNum(prev, 1) : '—'}
                />
              </View>
            );
          })}
        </View>
        <Btn label="Ölçüleri kaydet" onPress={save} />
      </Card>

      {logs.length === 0 ? (
        <Empty icon="user" title="Henüz ölçü kaydı yok" text="İki haftada bir aynı noktadan ölçmek değişimi görmek için yeterlidir." />
      ) : (
        <>
          <SectionTitle>Değişim</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MEASURES.filter((m) => latestOf(m.id) != null).map((m) => (
              <Chip key={m.id} label={m.name} selected={sel === m.id} onPress={() => setSel(m.id)} />
            ))}
          </View>
          {series.length ? (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatTile label={`${selName} · son`} value={fmtNum(lastV, 1)} unit="cm" sub={relDay(series[series.length - 1].date)} />
                <StatTile
                  label="İlk kayıttan beri"
                  value={series.length > 1 ? signed(lastV - firstV) : '—'}
                  unit={series.length > 1 ? 'cm' : undefined}
                  sub={series.length > 1 ? fmtDate(series[0].date, 'long') : undefined}
                />
              </View>
              <Card>
                <LineChart
                  unit="cm"
                  formatX={fmtDayNumber}
                  series={[
                    {
                      key: sel,
                      label: selName,
                      color: C.accent,
                      points: series.map((p) => ({ x: dayNumber(p.date), y: p.value })),
                    },
                  ]}
                />
              </Card>
            </>
          ) : (
            <T v="small">Bu ölçü için kayıt yok. Yukarıdan başka bir ölçü seç.</T>
          )}

          <SectionTitle>Kayıtlar</SectionTitle>
          {[...logs]
            .reverse()
            .slice(0, 12)
            .map((l) => (
              <Card key={l.date} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <T v="body" style={{ flex: 1, fontWeight: '600' }}>{fmtDate(l.date, 'long')}</T>
                  <IconBtn
                    name="x"
                    label="Kaydı sil"
                    size={16}
                    onPress={async () => {
                      const ok = await dialog.confirm({
                        title: 'Ölçü kaydı silinsin mi?',
                        message: fmtDate(l.date, 'long'),
                        confirmLabel: 'Sil',
                        danger: true,
                      });
                      if (ok) update((d) => void (d.measures = d.measures.filter((x) => x.date !== l.date)));
                    }}
                  />
                </View>
                <T v="small" style={{ lineHeight: 19 }}>
                  {MEASURES.filter((m) => l.values[m.id] != null)
                    .map((m) => `${m.name} ${fmtNum(l.values[m.id] as number, 1)}`)
                    .join(' · ')}
                </T>
              </Card>
            ))}
        </>
      )}
    </>
  );
}

export function BodyTab() {
  const [mode, setMode] = useState<'weight' | 'measure'>('weight');
  return (
    <Screen title="Vücut">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { key: 'weight', label: 'Kilo' },
          { key: 'measure', label: 'Ölçüler' },
        ]}
      />
      {mode === 'weight' ? <WeightSection /> : <MeasureSection />}
    </Screen>
  );
}
