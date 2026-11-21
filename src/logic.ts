import { DB, Exercise, MuscleId, ProgramDay, Workout, WorkoutEntry } from './types';
import { MUSCLES } from './data/muscles';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- Tarih ----------

export function toDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
export const todayStr = () => toDateStr(new Date());

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
export function dayNumber(s: string): number {
  return Math.round(parseDate(s).getTime() / 86400000);
}
export function daysAgo(s: string): number {
  return dayNumber(todayStr()) - dayNumber(s);
}

export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export function fmtDate(s: string, style: 'short' | 'long' | 'full' = 'short'): string {
  const d = parseDate(s);
  if (style === 'short') return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  if (style === 'long') return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`;
}
export function fmtDayNumber(n: number): string {
  return fmtDate(toDateStr(new Date(n * 86400000)), 'short');
}
export function relDay(s: string): string {
  const n = daysAgo(s);
  if (n === 0) return 'Bugün';
  if (n === 1) return 'Dün';
  if (n < 0) return fmtDate(s);
  return `${n} gün önce`;
}

// ---------- Sayı ----------

export function fmtNum(n: number, maxDec = 2): string {
  const p = Math.pow(10, maxDec);
  return String(Math.round(n * p) / p).replace('.', ',');
}
export function fmtInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
export function parseNum(t: string): number | null {
  const s = t.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) && n >= 0 ? n : null;
}

// ---------- Antrenman hesapları ----------

/** Epley formülüyle tahmini tek tekrar maksimumu. */
export function e1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface DoneSet {
  weight: number;
  reps: number;
}

export function doneSets(e: WorkoutEntry): DoneSet[] {
  return e.sets
    .filter((s) => s.done && s.reps != null && s.reps > 0)
    .map((s) => ({ weight: s.weight ?? 0, reps: s.reps as number }));
}

export interface Session {
  workoutId: string;
  date: string;
  startedAt: number;
  sets: DoneSet[];
  weighted: boolean;
  e1rm: number;
  topWeight: number;
  volume: number;
  bestReps: number;
  totalReps: number;
}

function makeSession(w: Workout, sets: DoneSet[]): Session {
  return {
    workoutId: w.id,
    date: w.date,
    startedAt: w.startedAt,
    sets,
    weighted: sets.some((s) => s.weight > 0),
    e1rm: Math.max(0, ...sets.map((s) => e1rm(s.weight, s.reps))),
    topWeight: Math.max(0, ...sets.map((s) => s.weight)),
    volume: sets.reduce((a, s) => a + s.weight * s.reps, 0),
    bestReps: Math.max(0, ...sets.map((s) => s.reps)),
    totalReps: sets.reduce((a, s) => a + s.reps, 0),
  };
}

export function sortWorkouts(ws: Workout[]): Workout[] {
  return [...ws].sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1));
}

/** Egzersiz başına, eskiden yeniye sıralı seans listesi. */
export function buildSessions(workouts: Workout[]): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  for (const w of sortWorkouts(workouts)) {
    const perEx = new Map<string, DoneSet[]>();
    for (const e of w.entries) {
      const sets = doneSets(e);
      if (!sets.length) continue;
      perEx.set(e.exerciseId, [...(perEx.get(e.exerciseId) ?? []), ...sets]);
    }
    for (const [exId, sets] of perEx) {
      const list = map.get(exId) ?? [];
      list.push(makeSession(w, sets));
      map.set(exId, list);
    }
  }
  return map;
}

/** Verilen antrenmandan önceki seanslar. */
export function sessionsBefore(all: Session[] | undefined, w: Pick<Workout, 'id' | 'date' | 'startedAt'>): Session[] {
  if (!all) return [];
  return all.filter(
    (s) => s.workoutId !== w.id && (s.date < w.date || (s.date === w.date && s.startedAt < w.startedAt)),
  );
}

export type Metric = 'e1rm' | 'top' | 'volume' | 'reps';

export function metricOf(s: Session, m: Metric): number {
  if (m === 'e1rm') return s.e1rm;
  if (m === 'top') return s.topWeight;
  if (m === 'volume') return s.volume;
  return s.bestReps;
}

/** Egzersizin ağırlıklı mı vücut ağırlığıyla mı takip edildiğine göre ana ölçü. */
export function mainMetric(sessions: Session[]): Metric {
  return sessions.some((s) => s.weighted) ? 'e1rm' : 'reps';
}

export interface Suggestion {
  kind: 'weight' | 'reps';
  text: string;
}

/** Çift ilerleme: tekrar aralığının üstü dolunca kilo artır, dolmadıysa tekrar ekle. */
export function suggest(last: Session | undefined, repMin: number, repMax: number, increment: number): Suggestion | null {
  if (!last) return null;
  if (!last.weighted) {
    return { kind: 'reps', text: `En iyi setin ${last.bestReps} tekrar. Bugün ${last.bestReps + 1} tekrarı dene.` };
  }
  const top = last.topWeight;
  const topSets = last.sets.filter((s) => s.weight === top);
  if (topSets.every((s) => s.reps >= repMax)) {
    return {
      kind: 'weight',
      text: `Aralığı doldurdun. Kiloyu ${fmtNum(top + increment)} kg yap, ${repMin} tekrardan başla.`,
    };
  }
  const low = Math.min(...topSets.map((s) => s.reps));
  return {
    kind: 'reps',
    text: `${fmtNum(top)} kg ile devam. Setlerde ${Math.min(low + 1, repMax)} tekrara çık, hedef ${repMax}.`,
  };
}

/** Son üç seansta yeni rekor gelmediyse true. */
export function isStalled(sessions: Session[]): boolean {
  if (sessions.length < 5) return false;
  const m = mainMetric(sessions);
  const recent = sessions.slice(-3);
  const earlier = sessions.slice(0, -3);
  const bestEarlier = Math.max(...earlier.map((s) => metricOf(s, m)));
  return recent.every((s) => metricOf(s, m) <= bestEarlier);
}

export function fmtSets(sets: DoneSet[]): string {
  return sets.map((s) => (s.weight > 0 ? `${fmtNum(s.weight)}×${s.reps}` : `${s.reps}`)).join(' · ');
}

export interface WorkoutStats {
  sets: number;
  volume: number;
  exercises: number;
  minutes: number | null;
}

export function workoutStats(w: Workout, now = Date.now()): WorkoutStats {
  let sets = 0;
  let volume = 0;
  let exercises = 0;
  for (const e of w.entries) {
    const d = doneSets(e);
    if (d.length) exercises++;
    sets += d.length;
    volume += d.reduce((a, s) => a + s.weight * s.reps, 0);
  }
  const end = w.finishedAt ?? now;
  const minutes = end > w.startedAt ? Math.max(1, Math.round((end - w.startedAt) / 60000)) : null;
  return { sets, volume, exercises, minutes };
}

export function fmtMinutes(m: number | null): string {
  if (m == null) return '—';
  if (m < 60) return `${m} dk`;
  return `${Math.floor(m / 60)} sa ${m % 60} dk`;
}

// ---------- Kas yükü ----------

export interface MuscleLoad {
  sets: number;
  weekly: number;
  last: string | null;
}

export function emptyLoad(): Record<MuscleId, MuscleLoad> {
  const o = {} as Record<MuscleId, MuscleLoad>;
  for (const m of MUSCLES) o[m.id] = { sets: 0, weekly: 0, last: null };
  return o;
}

/** Ana kas 1 set, yardımcı kas yarım set sayılır. */
export function muscleLoad(db: DB, exMap: Map<string, Exercise>, rangeDays: number): Record<MuscleId, MuscleLoad> {
  const out = emptyLoad();
  const all = db.active ? [...db.workouts, db.active] : db.workouts;
  for (const w of all) {
    const ago = daysAgo(w.date);
    for (const e of w.entries) {
      const n = doneSets(e).length;
      if (!n) continue;
      const exr = exMap.get(e.exerciseId);
      if (!exr) continue;
      const touch = (m: MuscleId, factor: number) => {
        const o = out[m];
        if (!o) return;
        if (ago >= 0 && ago < rangeDays) o.sets += n * factor;
        if (o.last == null || w.date > o.last) o.last = w.date;
      };
      exr.primary.forEach((m) => touch(m, 1));
      exr.secondary.forEach((m) => touch(m, 0.5));
    }
  }
  for (const m of MUSCLES) out[m.id].weekly = (out[m.id].sets * 7) / rangeDays;
  return out;
}

export function dayMuscles(day: ProgramDay, exMap: Map<string, Exercise>): MuscleId[] {
  const seen: MuscleId[] = [];
  for (const it of day.items) {
    for (const m of exMap.get(it.exerciseId)?.primary ?? []) if (!seen.includes(m)) seen.push(m);
  }
  return seen;
}

export function workoutMuscles(w: Workout, exMap: Map<string, Exercise>): MuscleId[] {
  const seen: MuscleId[] = [];
  for (const e of w.entries) {
    for (const m of exMap.get(e.exerciseId)?.primary ?? []) if (!seen.includes(m)) seen.push(m);
  }
  return seen;
}

/** Haftanın pazartesi günü. */
export function weekStart(s: string): string {
  const d = parseDate(s);
  const off = (d.getDay() + 6) % 7;
  return addDays(s, -off);
}

/** Tarihe göre sıralı kayıtlar için 7 günlük hareketli ortalama. */
export function movingAverage(points: { date: string; value: number }[], window = 7): { date: string; value: number }[] {
  return points.map((p) => {
    const lo = dayNumber(p.date) - (window - 1);
    const hi = dayNumber(p.date);
    const inWin = points.filter((q) => {
      const n = dayNumber(q.date);
      return n >= lo && n <= hi;
    });
    return { date: p.date, value: inWin.reduce((a, q) => a + q.value, 0) / inWin.length };
  });
}
