import { DB, ProgramDay, SetEntry, Workout, WorkoutEntry } from './types';
import { addDays, parseDate, todayStr, uid } from './logic';
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

// ---------- Haftalık plan ----------

export const WEEKDAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const WEEKDAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/** Tarihin hafta günü: 0 = Pazartesi, 6 = Pazar. */
export function weekdayIndex(date: string): number {
  return (parseDate(date).getDay() + 6) % 7;
}

/** Haftanın yedi günü için atanmış program günü (yoksa null). */
export function scheduleOf(d: DB): (ProgramDay | null)[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => d.days.find((x) => x.weekdays?.includes(i)) ?? null);
}

/**
 * Bir hafta gününe program günü atar (null: dinlenme). Her hafta gününde en fazla bir
 * program günü olur. Haftalık antrenman hedefi planlanan gün sayısına eşitlenir.
 */
export function assignWeekday(d: DB, weekday: number, dayId: string | null): void {
  for (const day of d.days) {
    const without = (day.weekdays ?? []).filter((w) => w !== weekday);
    day.weekdays = day.id === dayId ? [...without, weekday].sort((a, b) => a - b) : without;
  }
  const planned = d.days.reduce((a, day) => a + (day.weekdays?.length ?? 0), 0);
  if (planned > 0) d.settings.weeklyGoal = planned;
}

export interface Upcoming {
  day: ProgramDay;
  date: string;
  /** Bugünden kaç gün sonra (1 = yarın). */
  inDays: number;
}

export type TodayPlan =
  /** Haftalık plan yok: günler sırayla döner. */
  | { kind: 'rotation'; day: ProgramDay | null }
  | { kind: 'today'; day: ProgramDay }
  /** Dün planlıydı ama yapılmadı, bugün boş. */
  | { kind: 'missed'; day: ProgramDay }
  | { kind: 'done'; day: ProgramDay; next: Upcoming | null }
  | { kind: 'rest'; next: Upcoming | null };

/** Bugün ne yapılacağını haftalık plana (yoksa sıraya) göre söyler. */
export function todayPlan(d: DB): TodayPlan {
  const sched = scheduleOf(d);
  if (sched.every((x) => x == null)) {
    const id = nextDayId(d);
    return { kind: 'rotation', day: d.days.find((x) => x.id === id) ?? null };
  }
  const today = todayStr();
  const doneOn = (dayId: string, date: string) => d.workouts.some((w) => w.dayId === dayId && w.date === date);

  let next: Upcoming | null = null;
  for (let i = 1; i <= 7 && !next; i++) {
    const date = addDays(today, i);
    const day = sched[weekdayIndex(date)];
    if (day) next = { day, date, inDays: i };
  }

  const planned = sched[weekdayIndex(today)];
  if (planned) return doneOn(planned.id, today) ? { kind: 'done', day: planned, next } : { kind: 'today', day: planned };

  const yesterday = addDays(today, -1);
  const missed = sched[weekdayIndex(yesterday)];
  const trainedToday = d.workouts.some((w) => w.date === today);
  if (missed && !trainedToday && !doneOn(missed.id, yesterday)) return { kind: 'missed', day: missed };
  return { kind: 'rest', next };
}
