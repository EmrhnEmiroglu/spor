import { DB, ProgramDay, SetEntry, Workout, WorkoutEntry } from './types';
import { parseDate, todayStr, uid } from './logic';
import { ProgramTemplate } from './data/exercises';

export const emptySet = (): SetEntry => ({ weight: null, reps: null, done: false });

export function makeEntry(exerciseId: string, sets = 3, repMin = 8, repMax = 12): WorkoutEntry {
  return { exerciseId, repMin, repMax, sets: Array.from({ length: sets }, emptySet) };
}

export function workoutFromDay(day: ProgramDay | null): Workout {
  return {
    id: uid(),
    date: todayStr(),
    startedAt: Date.now(),
    finishedAt: null,
    name: day ? day.name : 'Serbest antrenman',
    dayId: day ? day.id : null,
    entries: day ? day.items.map((it) => makeEntry(it.exerciseId, it.sets, it.repMin, it.repMax)) : [],
    note: '',
  };
}

/** Geçmiş bir güne sonradan girilen antrenman. */
export function pastWorkout(date: string): Workout {
  const t = parseDate(date).getTime();
  return { id: uid(), date, startedAt: t, finishedAt: t, name: 'Antrenman', dayId: null, entries: [], note: '' };
}

/** İşaretlenmemiş setleri ve boş kalan egzersizleri atar. */
export function pruneWorkout(w: Workout): void {
  for (const e of w.entries) e.sets = e.sets.filter((s) => s.done && s.reps != null && s.reps > 0);
  w.entries = w.entries.filter((e) => e.sets.length > 0);
}

/** Isınma setleri dahil, işaretlenmiş set sayısı. */
export function countDone(w: Workout): number {
  return w.entries.reduce((a, e) => a + e.sets.filter((s) => s.done && s.reps != null && s.reps > 0).length, 0);
}

/** Aktif antrenmanı kaydeder. Kaydedilen antrenmanın kimliğini döner. */
export function finishActive(d: DB): string | null {
  const w = d.active;
  if (!w) return null;
  pruneWorkout(w);
  d.active = null;
  if (!w.entries.length) return null;
  w.finishedAt = Date.now();
  d.workouts.push(w);
  return w.id;
}

export function addTemplate(d: DB, t: ProgramTemplate): void {
  for (const day of t.days) {
    d.days.push({
      id: uid(),
      name: day.name,
      items: day.items.map(([exerciseId, sets, repMin, repMax]) => ({ exerciseId, sets, repMin, repMax })),
    });
  }
}

/** Programda sıradaki gün: son yapılan günden sonraki. */
export function nextDayId(d: DB): string | null {
  if (!d.days.length) return null;
  const done = [...d.workouts]
    .filter((w) => w.dayId && d.days.some((x) => x.id === w.dayId))
    .sort((a, b) => (a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1));
  if (!done.length) return d.days[0].id;
  const idx = d.days.findIndex((x) => x.id === done[0].dayId);
  return d.days[(idx + 1) % d.days.length].id;
}
