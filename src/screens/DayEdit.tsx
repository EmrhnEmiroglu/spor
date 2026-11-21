import React from 'react';
import { View } from 'react-native';
import { useDB, useExercises } from '../store';
import { useNav } from '../nav';
import { Btn, Card, Empty, Field, IconBtn, Screen, Stepper, T, useDialog } from '../ui';
import { ProgramDay } from '../types';

export function DayEditScreen({ dayId }: { dayId: string }) {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const { map } = useExercises();
  const day = db.days.find((d) => d.id === dayId);

  if (!day) {
    return (
      <Screen title="Gün" onBack={nav.pop} overlay>
        {null}
      </Screen>
    );
  }

  const mutate = (fn: (d: ProgramDay) => void) =>
    update((d) => {
      const t = d.days.find((x) => x.id === dayId);
      if (t) fn(t);
    });

  const remove = async () => {
    const ok = await dialog.confirm({
      title: `${day.name} silinsin mi?`,
      message: 'Gün programdan kalkar. Geçmiş antrenmanların silinmez.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    update((d) => {
      d.days = d.days.filter((x) => x.id !== dayId);
    });
    nav.pop();
  };

  const idx = db.days.findIndex((d) => d.id === dayId);
  const moveDay = (dir: 1 | -1) =>
    update((d) => {
      const [it] = d.days.splice(idx, 1);
      d.days.splice(idx + dir, 0, it);
    });

  const moveItem = (i: number, dir: 1 | -1) =>
    mutate((d) => {
      const [x] = d.items.splice(i, 1);
      d.items.splice(i + dir, 0, x);
    });

  return (
    <Screen title="Günü düzenle" onBack={nav.pop} overlay right={<Btn label="Tamam" small onPress={nav.pop} />}>
      <Field
        value={day.name}
        onChangeText={(t) => mutate((d) => void (d.name = t))}
        placeholder="Gün adı"
        style={{ fontWeight: '600' }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T v="small">
          Programdaki sırası: {idx + 1}/{db.days.length}
        </T>
        <View style={{ flexDirection: 'row' }}>
          <IconBtn name="arrow-up" label="Günü öne al" disabled={idx === 0} onPress={() => moveDay(-1)} />
          <IconBtn name="arrow-down" label="Günü sona al" disabled={idx === db.days.length - 1} onPress={() => moveDay(1)} />
        </View>
      </View>

      {day.items.length === 0 ? (
        <Empty
          icon="dumbbell"
          title="Bu günde egzersiz yok"
          text="Aşağıdan egzersiz ekle. Set sayısını ve tekrar aralığını sonra ayarlarsın."
        />
      ) : null}

      {day.items.map((it, i) => (
        <Card key={i + it.exerciseId} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T v="h2" style={{ flex: 1 }} numberOfLines={1}>{map.get(it.exerciseId)?.name ?? 'Silinmiş egzersiz'}</T>
            <IconBtn name="arrow-up" label="Yukarı taşı" disabled={i === 0} onPress={() => moveItem(i, -1)} />
            <IconBtn name="arrow-down" label="Aşağı taşı" disabled={i === day.items.length - 1} onPress={() => moveItem(i, 1)} />
            <IconBtn name="trash" label="Kaldır" onPress={() => mutate((d) => void d.items.splice(i, 1))} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Stepper label="Set" value={it.sets} min={1} max={10} onChange={(n) => mutate((d) => void (d.items[i].sets = n))} />
            <Stepper
              label="En az tekrar"
              value={it.repMin}
              min={1}
              max={it.repMax}
              onChange={(n) => mutate((d) => void (d.items[i].repMin = n))}
            />
            <Stepper
              label="En çok tekrar"
              value={it.repMax}
              min={it.repMin}
              max={50}
              onChange={(n) => mutate((d) => void (d.items[i].repMax = n))}
            />
          </View>
        </Card>
      ))}

      <Btn
        label="Egzersiz ekle"
        icon="plus"
        kind="secondary"
        onPress={() => nav.push({ name: 'picker', target: { kind: 'day', dayId } })}
      />
      <Btn label="Günü sil" kind="ghost" onPress={remove} style={{ marginTop: 8 }} />
    </Screen>
  );
}
