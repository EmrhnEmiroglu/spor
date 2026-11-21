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
  fmtRir,
  fmtSets,
  sessionsBefore,
  suggest,
  todayStr,
  workoutStats,
} from '../logic';
import { countDone, emptySet, finishActive, pruneWorkout } from '../actions';
import { MUSCLE_NAME } from '../data/muscles';
import { RestBar, primeAudio, useRestActions } from '../timer';

export function EditorScreen({ workoutId }: { workoutId: string | null }) {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const rest = useRestActions();
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
        rest.stop();
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
    rest.stop();
    update((d) => {
      finishActive(d);
    });
    nav.replace({ name: 'workoutDetail', id, fresh: true });
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
    if (isActive) rest.stop();
    update((d) => {
      if (isActive) d.active = null;
      else d.workouts = d.workouts.filter((x) => x.id !== w.id);
    });
    nav.pop();
  };

  const onSetDone = () => {
    if (!isActive || !db.settings.restEnabled) return;
    primeAudio();
    rest.start(db.settings.restSeconds);
  };

  const stats = workoutStats(w, now);

  return (
    <View style={{ flex: 1 }}>
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
            note={db.exerciseNotes[e.exerciseId] ?? ''}
            before={sessionsBefore(index.get(e.exerciseId), w)}
            increment={db.settings.increment}
            trackRir={db.settings.trackRir}
            canUp={ei > 0}
            canDown={ei < w.entries.length - 1}
            onChange={(fn) => mutate((x) => fn(x.entries[ei]))}
            onNote={(t) =>
              update((d) => {
                if (t.trim()) d.exerciseNotes[e.exerciseId] = t;
                else delete d.exerciseNotes[e.exerciseId];
              })
            }
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
            onSwap={() => nav.push({ name: 'swap', workoutId, entryIndex: ei })}
            onPlates={(weight) => nav.push({ name: 'plates', weight })}
            onOpenProgress={() => nav.push({ name: 'exerciseProgress', exerciseId: e.exerciseId })}
            onSetDone={onSetDone}
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
      {isActive ? <RestBar /> : null}
    </View>
  );
}

function EntryCard({
  entry,
  name,
  muscles,
  note,
  before,
  increment,
  trackRir,
  canUp,
  canDown,
  onChange,
  onNote,
  onMove,
  onRemove,
  onSwap,
  onPlates,
  onOpenProgress,
  onSetDone,
  toast,
}: {
  entry: WorkoutEntry;
  name: string;
  muscles: string;
  note: string;
  before: Session[];
  increment: number;
  trackRir: boolean;
  canUp: boolean;
  canDown: boolean;
  onChange: (fn: (e: WorkoutEntry) => void) => void;
  onNote: (t: string) => void;
  onMove: (dir: 1 | -1) => void;
  onRemove: () => void;
  onSwap: () => void;
  onPlates: (weight: number | null) => void;
  onOpenProgress: () => void;
  onSetDone: () => void;
  toast: (m: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [rirFor, setRirFor] = useState<number | null>(null);
  const last = before.length ? before[before.length - 1] : undefined;
  const hint = suggest(last, entry.repMin, entry.repMax, increment);
  const bestE1rm = before.length ? Math.max(...before.map((s) => s.e1rm)) : 0;
  const bestReps = before.length ? Math.max(...before.map((s) => s.bestReps)) : 0;

  // Isınma setleri sayılmadığı için "kaçıncı çalışma seti" ayrı tutulur.
  const workIdx: number[] = [];
  let counter = 0;
  for (const s of entry.sets) {
    workIdx.push(s.warmup ? -1 : counter);
    if (!s.warmup) counter++;
  }

  // Boş bırakılan alanlar için öneri: kilo bu antrenmandaki önceki setten,
  // tekrar geçen seferki aynı setten gelir.
  const placeholder = (si: number): { weight: number | null; reps: number | null } => {
    if (entry.sets[si].warmup) return { weight: null, reps: null };
    const earlier = entry.sets
      .slice(0, si)
      .filter((s) => !s.warmup)
      .reverse();
    const prevWeight = earlier.find((s) => s.weight != null);
    const prevReps = earlier.find((s) => s.reps != null);
    const lastSet = last ? last.sets[Math.min(workIdx[si], last.sets.length - 1)] : undefined;
    return {
      weight: prevWeight?.weight ?? (lastSet ? lastSet.weight : null),
      reps: lastSet?.reps ?? prevReps?.reps ?? null,
    };
  };

  const toggle = (si: number) => {
    const s = entry.sets[si];
    if (s.done) {
      onChange((e) => void (e.sets[si].done = false));
      if (rirFor === si) setRirFor(null);
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
    setRirFor(trackRir && !s.warmup ? si : null);
    onSetDone();
  };

  const toggleWarmup = (si: number) =>
    onChange((e) => {
      const s = e.sets[si];
      s.warmup = !s.warmup;
      if (s.warmup) s.rir = null;
    });

  const plateWeight = (): number | null => {
    const si = entry.sets.findIndex((s) => !s.done && !s.warmup);
    if (si >= 0) return entry.sets[si].weight ?? placeholder(si).weight;
    return last ? last.topWeight : null;
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

      {note && !menu ? (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
          <View style={{ marginTop: 2 }}>
            <Icon name="edit" size={13} color={C.muted} />
          </View>
          <T v="small" style={{ flex: 1, lineHeight: 18 }}>{note}</T>
        </View>
      ) : null}

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
          <Field value={note} onChangeText={onNote} placeholder="Not (ör. koltuk 4, dar tutuş)" style={{ backgroundColor: C.surface }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Değiştir" icon="repeat" kind="secondary" small onPress={onSwap} style={{ flex: 1 }} />
            <Btn label="Plaka" icon="disc" kind="secondary" small onPress={() => onPlates(plateWeight())} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row' }}>
              <IconBtn name="arrow-up" label="Yukarı taşı" disabled={!canUp} onPress={() => onMove(-1)} />
              <IconBtn name="arrow-down" label="Aşağı taşı" disabled={!canDown} onPress={() => onMove(1)} />
              <IconBtn name="trend" label="İlerlemeyi gör" onPress={onOpenProgress} />
            </View>
            <Btn label="Kaldır" icon="trash" kind="danger" small onPress={onRemove} />
          </View>
          <T v="tiny" style={{ lineHeight: 16 }}>
            Set numarasına dokunursan o set ısınma seti olur. Isınma setleri rekor, hacim ve kas haritasına sayılmaz.
          </T>
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
        <T v="tiny" style={{ width: 28, textAlign: 'center' }}>Set</T>
        <T v="tiny" style={{ width: 56, textAlign: 'center' }}>Önceki</T>
        <T v="tiny" style={{ flex: 1, textAlign: 'center' }}>Kg</T>
        <T v="tiny" style={{ flex: 1, textAlign: 'center' }}>Tekrar</T>
        <View style={{ width: 44 }} />
        <View style={{ width: 24 }} />
      </View>

      {entry.sets.map((s, si) => {
        const ph = placeholder(si);
        const prev = s.warmup ? undefined : last?.sets[workIdx[si]];
        const weighted = (s.weight ?? 0) > 0;
        const pr =
          s.done && !s.warmup && s.reps != null && before.length > 0
            ? weighted
              ? e1rm(s.weight ?? 0, s.reps) > bestE1rm + 0.001
              : bestE1rm === 0 && s.reps > bestReps
            : false;
        const canRate = trackRir && s.done && !s.warmup;
        return (
          <React.Fragment key={si}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                padding: 2,
                borderRadius: 12,
                backgroundColor: s.done ? (s.warmup ? C.surface2 : C.goodDim) : 'transparent',
              }}
            >
              <Pressable
                onPress={() => toggleWarmup(si)}
                accessibilityLabel={s.warmup ? 'Isınma setini normal sete çevir' : 'Isınma seti yap'}
                hitSlop={4}
                style={{ width: 28, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                {pr ? (
                  <Icon name="award" size={16} color={C.warning} />
                ) : (
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: s.warmup ? C.surface3 : 'transparent',
                      borderWidth: 1,
                      borderColor: s.warmup ? C.borderStrong : 'transparent',
                    }}
                  >
                    <Text style={{ color: C.text2, fontSize: 14, fontWeight: '600' }}>{s.warmup ? 'I' : workIdx[si] + 1}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                disabled={!canRate}
                onPress={() => setRirFor(rirFor === si ? null : si)}
                style={{ width: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <T v="tiny" numberOfLines={1}>
                  {s.warmup ? 'Isınma' : prev ? (prev.weight > 0 ? `${fmtNum(prev.weight)}×${prev.reps}` : `${prev.reps}`) : '—'}
                </T>
                {canRate ? (
                  <T v="tiny" color={s.rir != null ? C.text2 : C.accent} style={{ fontSize: 11 }} numberOfLines={1}>
                    {s.rir != null ? fmtRir(s.rir) : 'zorluk?'}
                  </T>
                ) : null}
              </Pressable>
              <NumInput
                value={s.weight}
                onChange={(n) => onChange((e) => void (e.sets[si].weight = n))}
                placeholder={ph.weight != null ? fmtNum(ph.weight) : '0'}
                style={{ flex: 1 }}
                done={s.done}
              />
              <NumInput
                value={s.reps}
                onChange={(n) => onChange((e) => void (e.sets[si].reps = n))}
                placeholder={ph.reps != null ? String(ph.reps) : '0'}
                decimal={false}
                style={{ flex: 1 }}
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
                onPress={() => {
                  if (rirFor != null) setRirFor(null);
                  onChange((e) => void e.sets.splice(si, 1));
                }}
                accessibilityLabel="Seti sil"
                hitSlop={8}
                style={{ width: 24, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="x" size={16} color={C.muted} />
              </Pressable>
            </View>

            {rirFor === si && canRate ? (
              <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 10, gap: 8 }}>
                <T v="small">Kaç tekrar daha çıkardı?</T>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[0, 1, 2, 3, 4].map((n) => {
                    const on = s.rir === n;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => {
                          onChange((e) => void (e.sets[si].rir = on ? null : n));
                          setRirFor(null);
                        }}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: on ? C.accent : C.surface3,
                        }}
                      >
                        <Text style={{ color: on ? C.onAccent : C.text, fontSize: 15, fontWeight: '600' }}>{n === 4 ? '4+' : n}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </React.Fragment>
        );
      })}

      <Btn label="Set ekle" icon="plus" kind="ghost" small onPress={() => onChange((e) => void e.sets.push(emptySet()))} />
    </Card>
  );
}
