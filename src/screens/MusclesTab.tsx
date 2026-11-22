import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useDB, useExercises } from '../store';
import { useNav } from '../nav';
import { Btn, Card, Icon, IconBtn, IconName, Screen, SectionTitle, Segmented, T } from '../ui';
import { C, HEAT_NONE, HEAT_STEPS, heatColor } from '../theme';
import { BodyMap } from '../bodymap';
import { BarChart, RangePicker, useRangeWeeks } from '../charts';
import { MUSCLES, MUSCLE_NAME } from '../data/muscles';
import { MuscleId } from '../types';
import {
  TargetStatus,
  addDays,
  doneSets,
  fmtNum,
  fmtWeek,
  muscleLoadBetween,
  muscleWeeklySeries,
  relDay,
  targetOf,
  targetStatus,
  todayStr,
  weekStart,
  weekStarts,
} from '../logic';

type Mode = 'r7' | 'week' | 'r28';

const STATUS: Record<TargetStatus, { label: string; icon: IconName; color: string }> = {
  low: { label: 'Eksik', icon: 'arrow-down', color: C.muted },
  ok: { label: 'Hedefte', icon: 'check', color: C.good },
  high: { label: 'Fazla', icon: 'arrow-up', color: C.warning },
};

export function MusclesTab() {
  const { db } = useDB();
  const nav = useNav();
  const { map } = useExercises();
  const [mode, setMode] = useState<Mode>('r7');
  const [weekOffset, setWeekOffset] = useState(0);
  const [sel, setSel] = useState<MuscleId | null>(null);
  const rangeWeeks = useRangeWeeks();
  const today = todayStr();

  // Seçilen döneme göre tarih aralığı ve kaç haftaya bölüneceği.
  const period = useMemo(() => {
    if (mode === 'r7') return { from: addDays(today, -6), to: today, weeks: 1, label: 'Bugün dahil son 7 gün' };
    if (mode === 'r28') return { from: addDays(today, -27), to: today, weeks: 4, label: 'Son 28 günün haftalık ortalaması' };
    const from = addDays(weekStart(today), -7 * weekOffset);
    return {
      from,
      to: addDays(from, 6),
      weeks: 1,
      label: weekOffset === 0 ? `Bu hafta · ${fmtWeek(from)}` : weekOffset === 1 ? `Geçen hafta · ${fmtWeek(from)}` : fmtWeek(from),
    };
  }, [mode, weekOffset, today]);

  const load = useMemo(() => muscleLoadBetween(db, map, period.from, period.to, period.weeks), [db, map, period]);
  const values = useMemo(() => {
    const o = {} as Record<MuscleId, number>;
    for (const m of MUSCLES) o[m.id] = load[m.id].weekly;
    return o;
  }, [load]);

  const rows = useMemo(() => [...MUSCLES].sort((a, b) => load[b.id].weekly - load[a.id].weekly), [load]);
  const scaleMax = Math.max(20, ...rows.map((r) => Math.max(load[r.id].weekly, targetOf(db.settings, r.id).max)));
  const anySets = rows.some((r) => load[r.id].sets > 0);
  const byStatus = (s: TargetStatus) =>
    rows.filter((r) => targetStatus(load[r.id].weekly, targetOf(db.settings, r.id)) === s).map((r) => r.name);
  const low = byStatus('low');
  const high = byStatus('high');

  // Seçili kasın hafta hafta set sayısı (ortak aralık seçiciye bağlı).
  const trend = useMemo(() => {
    if (!sel) return [];
    const starts = weekStarts(rangeWeeks);
    const series = muscleWeeklySeries(db, map, rangeWeeks)[sel];
    return starts.map((s, i) => ({ key: s, label: fmtWeek(s), y: series[i] }));
  }, [sel, db, map, rangeWeeks]);

  // Seçili kasa bu dönemde set yazan egzersizler.
  const contributors = useMemo(() => {
    if (!sel) return [];
    // done: yapılan set sayısı. counted: bu kasa yazılan (yardımcıysa yarısı).
    const acc = new Map<string, { name: string; direct: boolean; done: number; counted: number }>();
    const all = db.active ? [...db.workouts, db.active] : db.workouts;
    for (const w of all) {
      if (w.date < period.from || w.date > period.to) continue;
      for (const e of w.entries) {
        const exr = map.get(e.exerciseId);
        if (!exr) continue;
        const direct = exr.primary.includes(sel);
        if (!direct && !exr.secondary.includes(sel)) continue;
        const done = doneSets(e).length;
        if (!done) continue;
        const cur = acc.get(exr.id) ?? { name: exr.name, direct, done: 0, counted: 0 };
        cur.done += done;
        cur.counted += direct ? done : done * 0.5;
        acc.set(exr.id, cur);
      }
    }
    return [...acc.values()].sort((a, b) => Number(b.direct) - Number(a.direct) || b.counted - a.counted);
  }, [sel, db, map, period]);

  const unit = period.weeks === 1 ? 'set' : 'set/hafta';
  const selTarget = sel ? targetOf(db.settings, sel) : null;

  return (
    <Screen title="Kas haritası">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { key: 'r7', label: 'Son 7 gün' },
          { key: 'week', label: 'Hafta' },
          { key: 'r28', label: '4 hafta ort.' },
        ]}
      />

      {mode === 'week' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconBtn name="chevron-left" label="Önceki hafta" onPress={() => setWeekOffset((o) => o + 1)} />
          <T v="body" style={{ fontWeight: '600' }}>{period.label}</T>
          <IconBtn name="chevron-right" label="Sonraki hafta" disabled={weekOffset === 0} onPress={() => setWeekOffset((o) => Math.max(0, o - 1))} />
        </View>
      ) : (
        <T v="tiny" style={{ textAlign: 'center' }}>{period.label}</T>
      )}

      <Card style={{ gap: 14 }}>
        {/* Dokunulan kasın adı ve özeti: vücudun hemen üstünde, sabit yükseklikte. */}
        <View style={{ minHeight: 46, justifyContent: 'center' }}>
          {sel && selTarget ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: heatColor(load[sel].weekly) }} />
              <View style={{ flex: 1 }}>
                <T v="h2">{MUSCLE_NAME[sel]}</T>
                <T v="tiny" numberOfLines={1}>
                  Hedef {selTarget.min}–{selTarget.max} · {STATUS[targetStatus(load[sel].weekly, selTarget)].label}
                  {load[sel].last ? ` · son ${relDay(load[sel].last as string).toLocaleLowerCase('tr')}` : ' · henüz çalışılmadı'}
                </T>
                {load[sel].weekly > 0 ? (
                  <T v="tiny" numberOfLines={1}>
                    {fmtNum(load[sel].weeklyDirect, 1)} doğrudan + {fmtNum(load[sel].weeklyIndirect, 1)} dolaylı
                  </T>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T v="h2">{fmtNum(load[sel].weekly, 1)}</T>
                <T v="tiny">{unit}</T>
              </View>
            </View>
          ) : (
            <T v="small" style={{ textAlign: 'center' }}>Adını ve ayrıntısını görmek için bir kasa dokun. Çevirmek için sürükle.</T>
          )}
        </View>
        <BodyMap values={values} selected={sel} onSelect={(m) => setSel(sel === m ? null : m)} />
        <View style={{ gap: 6 }}>
          <T v="tiny">{period.weeks === 1 ? 'Haftalık set sayısı' : 'Haftalık ortalama set sayısı'}</T>
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

      {sel && selTarget ? (
        <Card style={{ gap: 8, borderColor: C.borderStrong }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T v="h2">{MUSCLE_NAME[sel]}</T>
            <T v="body" style={{ fontWeight: '600' }}>
              {fmtNum(load[sel].weekly, 1)} {unit}
            </T>
          </View>
          <T v="small">
            Hedef {selTarget.min}–{selTarget.max} set · {STATUS[targetStatus(load[sel].weekly, selTarget)].label}
            {load[sel].last ? ` · Son çalışma ${relDay(load[sel].last as string).toLocaleLowerCase('tr')}` : ''}
          </T>

          <T v="label" style={{ marginTop: 6 }}>Haftalık set</T>
          <BarChart
            bars={trend}
            unit="set"
            color={HEAT_STEPS[4].color}
            band={{ min: selTarget.min, max: selTarget.max, label: `Hedef aralığı: haftada ${selTarget.min}–${selTarget.max} set` }}
          />
          <RangePicker />

          <T v="label" style={{ marginTop: 6 }}>Bu dönemde nereden geldi</T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: C.surface2, borderRadius: 12, padding: 10 }}>
              <T v="tiny">Doğrudan</T>
              <T v="h2" style={{ marginTop: 2 }}>
                {fmtNum(load[sel].weeklyDirect, 1)} {unit}
              </T>
              <T v="tiny" style={{ marginTop: 2 }}>Bu kasın ana kas olduğu hareketler</T>
            </View>
            <View style={{ flex: 1, backgroundColor: C.surface2, borderRadius: 12, padding: 10 }}>
              <T v="tiny">Dolaylı</T>
              <T v="h2" style={{ marginTop: 2 }}>
                {fmtNum(load[sel].weeklyIndirect, 1)} {unit}
              </T>
              <T v="tiny" style={{ marginTop: 2 }}>Yardımcı olduğu hareketler, yarım sayılır</T>
            </View>
          </View>
          {contributors.length ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              {contributors.map((c) => (
                <View key={c.name + String(c.direct)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <T v="small" color={C.text} numberOfLines={1}>{c.name}</T>
                    <T v="tiny" numberOfLines={1}>
                      {c.direct ? `Ana kas · ${c.done} set` : `Yardımcı kas · ${c.done} setin yarısı`}
                    </T>
                  </View>
                  <T v="small" color={C.text} style={{ fontWeight: '600' }}>{fmtNum(c.counted, 1)} set</T>
                </View>
              ))}
            </View>
          ) : (
            <T v="small">Bu dönemde bu kasa set yazılmadı.</T>
          )}
          <T v="tiny" style={{ lineHeight: 17, marginTop: 2 }}>
            Örnek: barfikste ana kas kanattır, biceps yardımcıdır. 4 set barfiks kanada 4, bicepse 2 set yazar.
          </T>
        </Card>
      ) : null}

      <SectionTitle right={<Btn label="Hedefler" icon="target" kind="ghost" small onPress={() => nav.push({ name: 'muscleTargets' })} />}>
        Hedefe göre
      </SectionTitle>
      <Card style={{ gap: 2, paddingVertical: 8 }}>
        {rows.map((r) => {
          const l = load[r.id];
          const t = targetOf(db.settings, r.id);
          const st = STATUS[targetStatus(l.weekly, t)];
          const on = sel === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setSel(on ? null : r.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42 }}
            >
              <T v="small" color={on ? C.text : C.text2} style={{ width: 78, fontWeight: on ? '700' : '400' }} numberOfLines={1}>
                {r.name}
              </T>
              <View style={{ flex: 1, height: 18, justifyContent: 'center' }}>
                {/* Hedef aralığı: çubuğun arkasındaki açık bant. */}
                <View
                  style={{
                    position: 'absolute',
                    left: `${(t.min / scaleMax) * 100}%`,
                    width: `${((t.max - t.min) / scaleMax) * 100}%`,
                    height: 18,
                    borderRadius: 4,
                    backgroundColor: C.surface3,
                  }}
                />
                <View style={{ position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.border }} />
                {l.weekly > 0 ? (
                  <View
                    style={{
                      width: `${Math.max(2, (l.weekly / scaleMax) * 100)}%`,
                      height: 8,
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4,
                      backgroundColor: heatColor(l.weekly),
                    }}
                  />
                ) : null}
              </View>
              <T v="small" color={C.text} style={{ width: 32, textAlign: 'right', fontWeight: '600' }}>
                {l.weekly > 0 ? fmtNum(l.weekly, 1) : '0'}
              </T>
              <View style={{ width: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <Icon name={st.icon} size={12} color={st.color} width={2.5} />
                <T v="tiny" color={C.text2}>{st.label}</T>
              </View>
            </Pressable>
          );
        })}
      </Card>
      <T v="tiny" style={{ lineHeight: 17 }}>
        Gri bant her kasın haftalık hedef aralığıdır. Ana kas tam set, yardımcı kas yarım set sayılır. Isınma setleri sayılmaz.
      </T>

      {anySets && low.length ? (
        <T v="small" style={{ lineHeight: 19 }}>
          Hedefin altında: {low.join(', ')}.
        </T>
      ) : null}
      {anySets && high.length ? (
        <T v="small" style={{ lineHeight: 19 }}>
          Hedefin üstünde: {high.join(', ')}.
        </T>
      ) : null}
      {!anySets ? <T v="small">Bu dönemde kayıtlı set yok.</T> : null}
    </Screen>
  );
}
