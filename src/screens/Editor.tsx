import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useDB, useExercises } from '../store';
import { useNav } from '../nav';
import { Btn, Card, Field, Icon, IconBtn, NumInput, Screen, Stepper, T, useDialog, useNow } from '../ui';
import { C } from '../theme';
import { Workout, WorkoutEntry } from '../types';
import {
  Session,
  addDays,
  buildSessions,
  e1rm,
  fmtDate,
  fmtMinutes,
  fmtNum,
  fmtSets,
  sessionsBefore,
  suggest,
  todayStr,
  workoutStats,
} from '../logic';
import { countDone, emptySet, finishActive, pruneWorkout } from '../actions';
import { MUSCLE_NAME } from '../data/muscles';

export function EditorScreen({ workoutId }: { workoutId: string | null }) {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const { map } = useExercises();
  const now = useNow(30000);
  const isActive = workoutId === null;
  const w: Workout | null = isActive ? db.active : db.workouts.find((x) => x.id === workoutId) ?? null;
  const index = useMemo(() => buildSessions(db.workouts), [db.workouts]);

  if (!w) {
    return (
      <Screen title="Antrenman" onBack={nav.pop} overlay>
        {null}
      </Screen>
    );
  }

  const mutate = (fn: (w: Workout) => void) =>
    update((d) => {
      const t = isActive ? d.active : d.workouts.find((x) => x.id === workoutId);
      if (t) fn(t);
    });

  const finish = async () => {
    const done = countDone(w);
    if (done === 0) {
      const ok = await dialog.confirm({
        title: 'Tamamlanan set yok',
        message: 'Hiç set işaretlemedin. Antrenman kaydedilmeden kapatılsın mı?',
        confirmLabel: 'Kapat',
        danger: true,
      });
      if (ok) {
        update((d) => {
          d.active = null;
        });
        nav.pop();
      }
      return;
    }
    const total = w.entries.reduce((a, e) => a + e.sets.length, 0);
    const ok = await dialog.confirm({
      title: 'Antrenmanı bitir',
      message: total > done ? `İşaretlenmemiş ${total - done} set kaydedilmeyecek.` : `${done} set kaydedilecek.`,
      confirmLabel: 'Bitir',
    });
    if (!ok) return;
    const id = w.id;
    update((d) => {
      finishActive(d);
    });
    nav.replace({ name: 'workoutDetail', id });
  };

  const closeSaved = () => {
    if (countDone(w) === 0) {
      update((d) => {
        d.workouts = d.workouts.filter((x) => x.id !== w.id);
      });
      dialog.toast('Tamamlanan set olmadığı için antrenman silindi.');
    } else {
      mutate(pruneWorkout);
    }
    nav.pop();
  };

  const cancel = async () => {
    const ok = await dialog.confirm({
      title: isActive ? 'Antrenman iptal edilsin mi?' : 'Antrenman silinsin mi?',
      message: 'Girdiğin setler silinir. Bu işlem geri alınamaz.',
      confirmLabel: isActive ? 'İptal et' : 'Sil',
      danger: true,
    });
    if (!ok) return;
    update((d) => {
      if (isActive) d.active = null;
      else d.workouts = d.workouts.filter((x) => x.id !== w.id);
    });
    nav.pop();
  };

  const stats = workoutStats(w, now);

  return (
    <Screen
      title={isActive ? 'Antrenman' : 'Antrenmanı düzenle'}
      onBack={isActive ? nav.pop : closeSaved}
      overlay
      right={<Btn label={isActive ? 'Bitir' : 'Tamam'} small onPress={isActive ? finish : closeSaved} />}
    >
      <Field
        value={w.name}
        onChangeText={(t) => mutate((x) => void (x.name = t))}
        placeholder="Antrenman adı"
        style={{ fontWeight: '600' }}
      />

      {isActive ? (
        <T v="small">
          {fmtMinutes(stats.minutes)} · {stats.sets} set tamamlandı
        </T>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconBtn name="chevron-left" label="Önceki gün" onPress={() => mutate((x) => void (x.date = addDays(x.date, -1)))} />
          <T v="body" style={{ fontWeight: '600' }}>{fmtDate(w.date, 'long')}</T>
          <IconBtn
            name="chevron-right"
            label="Sonraki gün"
            disabled={w.date >= todayStr()}
            onPress={() => mutate((x) => void (x.date = addDays(x.date, 1)))}
          />
        </View>
      )}

      {w.entries.map((e, ei) => (
        <EntryCard
          key={ei + e.exerciseId}
          entry={e}
          name={map.get(e.exerciseId)?.name ?? 'Silinmiş egzersiz'}
          muscles={(map.get(e.exerciseId)?.primary ?? []).map((m) => MUSCLE_NAME[m]).join(', ')}
          before={sessionsBefore(index.get(e.exerciseId), w)}
          increment={db.settings.increment}
          canUp={ei > 0}
          canDown={ei < w.entries.length - 1}
          onChange={(fn) => mutate((x) => fn(x.entries[ei]))}
          onMove={(dir) =>
            mutate((x) => {
              const [it] = x.entries.splice(ei, 1);
              x.entries.splice(ei + dir, 0, it);
            })
          }
          onRemove={async () => {
            const ok = await dialog.confirm({
              title: 'Egzersiz kaldırılsın mı?',
              message: 'Bu egzersize girdiğin setler silinir.',
              confirmLabel: 'Kaldır',
              danger: true,
            });
            if (ok) mutate((x) => void x.entries.splice(ei, 1));
          }}
          onOpenProgress={() => nav.push({ name: 'exerciseProgress', exerciseId: e.exerciseId })}
          toast={dialog.toast}
        />
      ))}

      <Btn
        label="Egzersiz ekle"
        icon="plus"
        kind="secondary"
        onPress={() => nav.push({ name: 'picker', target: { kind: 'workout', workoutId } })}
      />
      <Btn label={isActive ? 'Antrenmanı iptal et' : 'Antrenmanı sil'} kind="ghost" onPress={cancel} style={{ marginTop: 8 }} />
    </Screen>
  );
}

function EntryCard({
  entry,
  name,
  muscles,
  before,
  increment,
  canUp,
  canDown,
  onChange,
  onMove,
  onRemove,
  onOpenProgress,
  toast,
}: {
  entry: WorkoutEntry;
  name: string;
  muscles: string;
  before: Session[];
  increment: number;
  canUp: boolean;
  canDown: boolean;
  onChange: (fn: (e: WorkoutEntry) => void) => void;
  onMove: (dir: 1 | -1) => void;
  onRemove: () => void;
  onOpenProgress: () => void;
  toast: (m: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const last = before.length ? before[before.length - 1] : undefined;
  const hint = suggest(last, entry.repMin, entry.repMax, increment);
  const bestE1rm = before.length ? Math.max(...before.map((s) => s.e1rm)) : 0;
  const bestReps = before.length ? Math.max(...before.map((s) => s.bestReps)) : 0;

  // Boş bırakılan alanlar için öneri: kilo bu antrenmandaki önceki setten,
  // tekrar geçen seferki aynı setten gelir.
  const placeholder = (si: number): { weight: number | null; reps: number | null } => {
    const earlier = entry.sets.slice(0, si).reverse();
    const prevWeight = earlier.find((s) => s.weight != null);
    const prevReps = earlier.find((s) => s.reps != null);
    const lastSet = last ? last.sets[Math.min(si, last.sets.length - 1)] : undefined;
    return {
      weight: prevWeight?.weight ?? (lastSet ? lastSet.weight : null),
      reps: lastSet?.reps ?? prevReps?.reps ?? null,
    };
  };

  const toggle = (si: number) => {
    const s = entry.sets[si];
    if (s.done) {
      onChange((e) => void (e.sets[si].done = false));
      return;
    }
    const ph = placeholder(si);
    const weight = s.weight ?? ph.weight;
    const reps = s.reps ?? ph.reps;
    if (!reps || reps <= 0) {
      toast('Önce tekrar sayısını gir.');
      return;
    }
    onChange((e) => {
      e.sets[si].weight = weight;
      e.sets[si].reps = reps;
      e.sets[si].done = true;
    });
  };

  return (
    <Card style={{ gap: 10, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable style={{ flex: 1 }} onPress={onOpenProgress}>
          <T v="h2" numberOfLines={1}>{name}</T>
          <T v="tiny" numberOfLines={1} style={{ marginTop: 2 }}>
            {muscles ? `${muscles} · ` : ''}
            {entry.repMin}–{entry.repMax} tekrar
          </T>
        </Pressable>
        <IconBtn name={menu ? 'chevron-up' : 'settings'} label="Egzersiz seçenekleri" onPress={() => setMenu((m) => !m)} />
      </View>

      {menu ? (
        <View style={{ gap: 12, backgroundColor: C.surface2, borderRadius: 12, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <Stepper
              label="En az tekrar"
              value={entry.repMin}
              min={1}
              max={entry.repMax}
              onChange={(n) => onChange((e) => void (e.repMin = n))}
            />
            <Stepper
              label="En çok tekrar"
              value={entry.repMax}
              min={entry.repMin}
              max={50}
              onChange={(n) => onChange((e) => void (e.repMax = n))}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row' }}>
              <IconBtn name="arrow-up" label="Yukarı taşı" disabled={!canUp} onPress={() => onMove(-1)} />
              <IconBtn name="arrow-down" label="Aşağı taşı" disabled={!canDown} onPress={() => onMove(1)} />
              <IconBtn name="trend" label="İlerlemeyi gör" onPress={onOpenProgress} />
            </View>
            <Btn label="Kaldır" icon="trash" kind="danger" small onPress={onRemove} />
          </View>
        </View>
      ) : null}

      {last ? (
        <View style={{ gap: 4 }}>
          <T v="small">
            Geçen sefer ({fmtDate(last.date)}): {fmtSets(last.sets)}
          </T>
          {hint ? (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <View style={{ marginTop: 2 }}>
                <Icon name={hint.kind === 'weight' ? 'arrow-up' : 'trend'} size={14} color={C.accent} />
              </View>
              <T v="small" color={C.text} style={{ flex: 1, lineHeight: 18 }}>{hint.text}</T>
            </View>
          ) : null}
        </View>
      ) : (
        <T v="small">İlk kayıt. Bugünkü setlerin başlangıç noktan olacak.</T>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}>
        <T v="tiny" style={{ width: 22, textAlign: 'center' }}>Set</T>
        <T v="tiny" style={{ width: 58, textAlign: 'center' }}>Önceki</T>
        <T v="tiny" style={{ flex: 1, textAlign: 'center' }}>Kg</T>
        <T v="tiny" style={{ flex: 1, textAlign: 'center' }}>Tekrar</T>
        <View style={{ width: 44 }} />
        <View style={{ width: 28 }} />
      </View>

      {entry.sets.map((s, si) => {
        const ph = placeholder(si);
        const prev = last?.sets[si];
        const weighted = (s.weight ?? 0) > 0;
        const pr =
          s.done && s.reps != null && before.length > 0
            ? weighted
              ? e1rm(s.weight ?? 0, s.reps) > bestE1rm + 0.001
              : bestE1rm === 0 && s.reps > bestReps
            : false;
        return (
          <View
            key={si}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              padding: 2,
              borderRadius: 12,
              backgroundColor: s.done ? C.goodDim : 'transparent',
            }}
          >
            <View style={{ width: 22, alignItems: 'center' }}>
              {pr ? (
                <Icon name="award" size={16} color={C.warning} />
              ) : (
                <Text style={{ color: C.text2, fontSize: 14, fontWeight: '600' }}>{si + 1}</Text>
              )}
            </View>
            <T v="tiny" style={{ width: 58, textAlign: 'center' }} numberOfLines={1}>
              {prev ? (prev.weight > 0 ? `${fmtNum(prev.weight)}×${prev.reps}` : `${prev.reps}`) : '—'}
            </T>
            <NumInput
              value={s.weight}
              onChange={(n) => onChange((e) => void (e.sets[si].weight = n))}
              placeholder={ph.weight != null ? fmtNum(ph.weight) : '0'}
              style={{ flex: 1, minWidth: 0 }}
              done={s.done}
            />
            <NumInput
              value={s.reps}
              onChange={(n) => onChange((e) => void (e.sets[si].reps = n))}
              placeholder={ph.reps != null ? String(ph.reps) : '0'}
              decimal={false}
              style={{ flex: 1, minWidth: 0 }}
              done={s.done}
            />
            <Pressable
              onPress={() => toggle(si)}
              accessibilityLabel={s.done ? 'Seti geri al' : 'Seti tamamla'}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: s.done ? C.good : C.surface2,
                borderWidth: 1,
                borderColor: s.done ? C.good : C.borderStrong,
              }}
            >
              <Icon name="check" size={20} color={s.done ? '#ffffff' : C.muted} width={2.5} />
            </Pressable>
            <Pressable
              onPress={() => onChange((e) => void e.sets.splice(si, 1))}
              accessibilityLabel="Seti sil"
              hitSlop={8}
              style={{ width: 28, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="x" size={16} color={C.muted} />
            </Pressable>
          </View>
        );
      })}

      <Btn label="Set ekle" icon="plus" kind="ghost" small onPress={() => onChange((e) => void e.sets.push(emptySet()))} />
    </Card>
  );
}
