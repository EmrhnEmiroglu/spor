import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useDB, useExercises } from '../store';
import { useNav } from '../nav';
import { Card, Chip, Empty, Field, Icon, NumInput, Screen, T, Tag } from '../ui';
import { C } from '../theme';
import { EQUIPMENT_NAME, MUSCLE_NAME } from '../data/muscles';
import { fmtNum, platesPerSide } from '../logic';
import { makeEntry } from '../actions';

/** Antrenmandaki bir egzersizi, aynı kası çalıştıran başka biriyle değiştirir. */
export function SwapScreen({ workoutId, entryIndex }: { workoutId: string | null; entryIndex: number }) {
  const { db, update } = useDB();
  const nav = useNav();
  const { list, map } = useExercises();
  const [q, setQ] = useState('');
  const w = workoutId ? db.workouts.find((x) => x.id === workoutId) : db.active;
  const entry = w?.entries[entryIndex];
  const cur = entry ? map.get(entry.exerciseId) : undefined;

  const options = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    const others = list.filter((e) => e.id !== cur?.id);
    if (needle) return others.filter((e) => e.name.toLocaleLowerCase('tr').includes(needle));
    if (!cur) return others;
    return others
      .map((e) => ({
        e,
        score:
          cur.primary.filter((m) => e.primary.includes(m)).length * 2 + cur.primary.filter((m) => e.secondary.includes(m)).length,
        same: cur.primary.some((m) => e.primary.includes(m)),
      }))
      .filter((x) => x.same)
      .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'tr'))
      .map((x) => x.e);
  }, [list, cur, q]);

  const used = new Set((w?.entries ?? []).map((e) => e.exerciseId));

  const pick = (id: string) => {
    update((d) => {
      const t = workoutId ? d.workouts.find((x) => x.id === workoutId) : d.active;
      const en = t?.entries[entryIndex];
      if (!t || !en) return;
      if (!en.sets.some((s) => s.done)) {
        en.exerciseId = id;
        for (const s of en.sets) {
          s.weight = null;
          s.reps = null;
          s.rir = null;
        }
        return;
      }
      // Tamamlanan setler eski egzersizde kalır, kalan setler yeni egzersize geçer.
      const remaining = en.sets.filter((s) => !s.done).length;
      en.sets = en.sets.filter((s) => s.done);
      t.entries.splice(entryIndex + 1, 0, makeEntry(id, Math.max(1, remaining), en.repMin, en.repMax));
    });
    nav.pop();
  };

  return (
    <Screen title="Egzersizi değiştir" onBack={nav.pop} overlay scroll={false}>
      <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}>
        {cur ? (
          <T v="small" style={{ lineHeight: 19 }}>
            {cur.name} yerine geçecek egzersizi seç. Aynı ana kası çalıştıranlar listeleniyor.
          </T>
        ) : null}
        <Field value={q} onChangeText={setQ} placeholder="Tüm egzersizlerde ara" />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {options.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => pick(e.id)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 60,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T v="body" style={{ fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{e.name}</T>
                {used.has(e.id) ? <Tag label="BU ANTRENMANDA" /> : null}
              </View>
              <T v="tiny" numberOfLines={1} style={{ marginTop: 2 }}>
                {e.primary.map((m) => MUSCLE_NAME[m]).join(', ')} · {EQUIPMENT_NAME[e.equipment]}
              </T>
            </View>
            <Icon name="chevron-right" size={18} color={C.muted} />
          </Pressable>
        ))}
        {options.length === 0 ? <Empty icon="search" title="Eşleşen egzersiz yok" text="Farklı bir ad ara." /> : null}
      </ScrollView>
    </Screen>
  );
}

const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
const BARS = [20, 15, 10, 7.5];
const PLATE_HEIGHT: Record<number, number> = { 25: 92, 20: 84, 15: 72, 10: 60, 5: 48, 2.5: 38, 1.25: 30, 0.5: 24 };

/** Girilen toplam kilo için barın her yanına takılacak plakaları hesaplar. */
export function PlatesScreen({ weight }: { weight: number | null }) {
  const { db, update } = useDB();
  const nav = useNav();
  const [total, setTotal] = useState<number | null>(weight);
  const bar = db.settings.barWeight;
  const plates = db.settings.plates;
  const res = total != null && total > 0 ? platesPerSide(total, bar, plates) : null;

  const togglePlate = (p: number) =>
    update((d) => {
      const has = d.settings.plates.includes(p);
      d.settings.plates = has ? d.settings.plates.filter((x) => x !== p) : [...d.settings.plates, p].sort((a, b) => b - a);
    });

  return (
    <Screen title="Plaka hesaplayıcı" onBack={nav.pop} overlay>
      <Card style={{ gap: 10 }}>
        <T v="label">Toplam kilo</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <NumInput value={total} onChange={setTotal} placeholder="Örn. 82,5" style={{ flex: 1, fontSize: 22, minHeight: 56 }} />
          <T v="body">kg</T>
        </View>
      </Card>

      {res ? (
        <Card style={{ gap: 12 }}>
          <T v="label">Barın her yanına</T>
          {total != null && total < bar ? (
            <T v="body">Bu kilo barın kendisinden hafif. Daha hafif bir bar seç.</T>
          ) : res.side.length === 0 ? (
            <T v="body">Plaka gerekmez, yalnızca bar.</T>
          ) : (
            <>
              <T v="h1">{res.side.map((p) => fmtNum(p)).join(' + ')}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 100 }}>
                <View style={{ width: 28, height: 10, backgroundColor: C.borderStrong, borderRadius: 2 }} />
                <View style={{ width: 8, height: 26, backgroundColor: C.muted, borderRadius: 2, marginRight: 2 }} />
                {res.side.map((p, i) => (
                  <View
                    key={i}
                    style={{
                      width: p >= 10 ? 18 : 12,
                      height: PLATE_HEIGHT[p] ?? 40,
                      marginRight: 2,
                      borderRadius: 4,
                      backgroundColor: C.accent,
                      opacity: 0.55 + Math.min(0.45, p / 55),
                    }}
                  />
                ))}
                <View style={{ width: 34, height: 10, backgroundColor: C.borderStrong, borderTopRightRadius: 2, borderBottomRightRadius: 2 }} />
              </View>
            </>
          )}
          {res.missing > 0.001 && total != null && total >= bar ? (
            <T v="small" style={{ lineHeight: 19 }}>
              Seçili plakalarla tam tutmuyor. En yakın alt kilo {fmtNum(res.achieved)} kg, {fmtNum(res.missing)} kg eksik kalır.
            </T>
          ) : (
            <T v="small">
              Bar {fmtNum(bar)} kg + her yanda {fmtNum(res.side.reduce((a, p) => a + p, 0))} kg = {fmtNum(res.achieved)} kg
            </T>
          )}
        </Card>
      ) : null}

      <Card style={{ gap: 10 }}>
        <T v="label">Bar ağırlığı</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BARS.map((b) => (
            <Chip key={b} label={`${fmtNum(b)} kg`} selected={bar === b} onPress={() => update((d) => void (d.settings.barWeight = b))} />
          ))}
        </View>
        <T v="label" style={{ marginTop: 6 }}>Salondaki plakalar</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ALL_PLATES.map((p) => (
            <Chip key={p} label={fmtNum(p)} selected={plates.includes(p)} onPress={() => togglePlate(p)} />
          ))}
        </View>
        <T v="tiny">Bu seçimler hatırlanır.</T>
      </Card>
    </Screen>
  );
}
