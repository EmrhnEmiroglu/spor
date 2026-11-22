import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useDB, useExercises } from '../store';
import { PickerTarget, useNav } from '../nav';
import { Btn, Chip, Field, Icon, IconBtn, Screen, T, Tag, useDialog } from '../ui';
import { C } from '../theme';
import { EQUIPMENT, EQUIPMENT_NAME, MUSCLES, MUSCLE_NAME } from '../data/muscles';
import { Equipment, MuscleId } from '../types';
import { buildSessions, matchesExercise, uid } from '../logic';
import { makeEntry } from '../actions';
import { isCurated } from '../data/exercises';

/** Uzun liste telefonu yormasın diye hareketler bu kadarlık dilimlerle gösterilir. */
const PAGE = 60;

export function PickerScreen({ target }: { target: PickerTarget }) {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const { list } = useExercises();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleId | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [picked, setPicked] = useState<string[]>([]);
  const index = useMemo(() => buildSessions(db.workouts), [db.workouts]);

  const shown = useMemo(() => {
    const hits = list.filter(
      (e) =>
        matchesExercise(e, q) &&
        (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)) &&
        (!equipment || e.equipment === equipment),
    );
    // Sıra: daha önce yaptıkların (en yeniden eskiye), sonra temel hareketler, sonra diğerleri.
    const lastUsed = (id: string) => {
      const h = index.get(id);
      return h?.length ? h[h.length - 1].date : '';
    };
    const rank = (e: (typeof hits)[number]) => (lastUsed(e.id) ? 0 : e.custom || isCurated(e) ? 1 : 2);
    return hits.sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (rank(a) === 0 && lastUsed(a.id) !== lastUsed(b.id)) return lastUsed(a.id) < lastUsed(b.id) ? 1 : -1;
      return 0;
    });
  }, [list, q, muscle, equipment, index]);

  // Filtre değişince liste baştan gösterilir.
  const resetAnd = <T,>(set: (v: T) => void) => (v: T) => {
    setLimit(PAGE);
    set(v);
  };

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const add = () => {
    update((d) => {
      if (target.kind === 'day') {
        const day = d.days.find((x) => x.id === target.dayId);
        if (day) for (const id of picked) day.items.push({ exerciseId: id, sets: 3, repMin: 8, repMax: 12 });
      } else {
        const w = target.workoutId ? d.workouts.find((x) => x.id === target.workoutId) : d.active;
        if (w) {
          for (const id of picked) {
            // Set sayısı, o egzersizin son antrenmandaki set sayısından gelir.
            const hist = index.get(id);
            const n = hist?.length ? Math.min(6, Math.max(1, hist[hist.length - 1].sets.length)) : 3;
            w.entries.push(makeEntry(id, n));
          }
        }
      }
    });
    nav.pop();
  };

  const removeCustom = async (id: string, name: string) => {
    const ok = await dialog.confirm({
      title: `${name} silinsin mi?`,
      message: 'Geçmiş antrenmanlardaki kayıtları kalır ama kas haritasına yansımaz.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    setPicked((p) => p.filter((x) => x !== id));
    update((d) => {
      d.customExercises = d.customExercises.filter((e) => e.id !== id);
    });
  };

  return (
    <Screen
      title="Egzersiz seç"
      onBack={nav.pop}
      overlay
      scroll={false}
      footer={
        <Btn label={picked.length ? `${picked.length} egzersiz ekle` : 'Egzersiz seç'} disabled={!picked.length} onPress={add} />
      }
    >
      <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 10 }}>
        <Field value={q} onChangeText={resetAnd(setQ)} placeholder="Ara: pullover, tek kol, kablo..." />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          <Chip label="Tüm kaslar" selected={!muscle} onPress={() => resetAnd(setMuscle)(null)} />
          {MUSCLES.map((m) => (
            <Chip
              key={m.id}
              label={m.name}
              selected={muscle === m.id}
              onPress={() => resetAnd(setMuscle)(muscle === m.id ? null : m.id)}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          <Chip label="Tüm ekipman" selected={!equipment} onPress={() => resetAnd(setEquipment)(null)} />
          {EQUIPMENT.map((x) => (
            <Chip
              key={x.id}
              label={x.name}
              selected={equipment === x.id}
              onPress={() => resetAnd(setEquipment)(equipment === x.id ? null : x.id)}
            />
          ))}
        </ScrollView>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <T v="tiny" style={{ paddingVertical: 6 }}>
          {shown.length} hareket{q || muscle || equipment ? '' : '. Daha önce yaptıkların üstte.'}
        </T>
        {shown.slice(0, limit).map((e) => {
          const on = picked.includes(e.id);
          return (
            <Pressable
              key={e.id}
              onPress={() => toggle(e.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 60,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  borderWidth: 1.5,
                  borderColor: on ? C.accent : C.borderStrong,
                  backgroundColor: on ? C.accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {on ? <Icon name="check" size={15} color="#fff" width={3} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T v="body" style={{ fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{e.name}</T>
                  {e.custom ? <Tag label="ÖZEL" /> : null}
                </View>
                <T v="tiny" numberOfLines={1} style={{ marginTop: 2 }}>
                  {e.primary.map((m) => MUSCLE_NAME[m]).join(', ')} · {EQUIPMENT_NAME[e.equipment]}
                </T>
              </View>
              {e.custom ? <IconBtn name="trash" label="Egzersizi sil" onPress={() => removeCustom(e.id, e.name)} /> : null}
            </Pressable>
          );
        })}
        {shown.length > limit ? (
          <Btn
            label={`${shown.length - limit} hareket daha göster`}
            kind="secondary"
            small
            onPress={() => setLimit((n) => n + PAGE)}
            style={{ marginTop: 12 }}
          />
        ) : null}
        {shown.length === 0 ? (
          <T v="small" style={{ textAlign: 'center', paddingVertical: 24 }}>Eşleşen egzersiz yok.</T>
        ) : null}
        <Btn
          label="Yeni egzersiz oluştur"
          icon="plus"
          kind="ghost"
          onPress={() => nav.push({ name: 'newExercise' })}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </Screen>
  );
}

export function NewExerciseScreen() {
  const { update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [primary, setPrimary] = useState<MuscleId[]>([]);
  const [secondary, setSecondary] = useState<MuscleId[]>([]);

  const flip = (list: MuscleId[], set: (l: MuscleId[]) => void, m: MuscleId) =>
    set(list.includes(m) ? list.filter((x) => x !== m) : [...list, m]);

  const save = () => {
    if (!name.trim()) return dialog.toast('Egzersize bir ad ver.');
    if (!primary.length) return dialog.toast('En az bir ana kas seç.');
    update((d) => {
      d.customExercises.push({
        id: 'c-' + uid(),
        name: name.trim(),
        equipment,
        primary,
        secondary: secondary.filter((m) => !primary.includes(m)),
        custom: true,
      });
    });
    nav.pop();
  };

  return (
    <Screen title="Yeni egzersiz" onBack={nav.pop} overlay footer={<Btn label="Kaydet" onPress={save} />}>
      <T v="label">Ad</T>
      <Field value={name} onChangeText={setName} placeholder="Örn. Smith Machine Squat" autoFocus />
      <T v="label" style={{ marginTop: 8 }}>Ekipman</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {EQUIPMENT.map((e) => (
          <Chip key={e.id} label={e.name} selected={equipment === e.id} onPress={() => setEquipment(e.id)} />
        ))}
      </View>
      <T v="label" style={{ marginTop: 8 }}>Ana kaslar</T>
      <T v="tiny">Her set bu kaslara tam set olarak yazılır.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {MUSCLES.map((m) => (
          <Chip key={m.id} label={m.name} selected={primary.includes(m.id)} onPress={() => flip(primary, setPrimary, m.id)} />
        ))}
      </View>
      <T v="label" style={{ marginTop: 8 }}>Yardımcı kaslar</T>
      <T v="tiny">Her set bu kaslara yarım set olarak yazılır.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {MUSCLES.filter((m) => !primary.includes(m.id)).map((m) => (
          <Chip
            key={m.id}
            label={m.name}
            selected={secondary.includes(m.id)}
            onPress={() => flip(secondary, setSecondary, m.id)}
          />
        ))}
      </View>
    </Screen>
  );
}
