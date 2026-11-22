import { DB, Exercise, MuscleId, MuscleTarget, ProgramDay, SetEntry, Settings, Workout, WorkoutEntry } from './types';
import { EQUIPMENT_NAME, MUSCLES, MUSCLE_NAME } from './data/muscles';

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
/** Saniyeyi 1:05 biçiminde yazar. */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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
  rir?: number | null;
}

/** Hesaplara giren set: tamamlanmış ve ısınma olmayan. */
export function isCounted(s: SetEntry): boolean {
  return s.done && !s.warmup && s.reps != null && s.reps > 0;
}

export function doneSets(e: WorkoutEntry): DoneSet[] {
  return e.sets.filter(isCounted).map((s) => ({ weight: s.weight ?? 0, reps: s.reps as number, rir: s.rir ?? null }));
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

/**
 * Çift ilerleme: tekrar aralığının üstü dolunca kilo artır, dolmadıysa tekrar ekle.
 * Zorluk girildiyse ve setler kolay geldiyse aralık dolmadan da kilo artışı önerir.
 */
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
  const rirs = topSets.map((s) => s.rir).filter((r): r is number => r != null);
  if (rirs.length === topSets.length && topSets.every((s) => s.reps >= repMin)) {
    const avg = rirs.reduce((a, r) => a + r, 0) / rirs.length;
    if (avg >= 3) {
      return {
        kind: 'weight',
        text: `Setler kolay geldi, ortalama ${fmtNum(avg, 1)} tekrar kaldı. Kiloyu ${fmtNum(top + increment)} kg yap.`,
      };
    }
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

export function fmtRir(rir: number): string {
  return rir >= 4 ? '4+ kaldı' : `${rir} kaldı`;
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

// ---------- Kas yükü ve hedefler ----------

export interface MuscleLoad {
  /** Aralıktaki toplam: doğrudan setler tam, dolaylı setler yarım sayılmış hali. */
  sets: number;
  weekly: number;
  /** Kasın ana kas olduğu hareketlerden gelen haftalık set. */
  weeklyDirect: number;
  /** Kasın yardımcı olduğu hareketlerden gelen haftalık set (yarım sayılmış). */
  weeklyIndirect: number;
  last: string | null;
}

export function emptyLoad(): Record<MuscleId, MuscleLoad> {
  const o = {} as Record<MuscleId, MuscleLoad>;
  for (const m of MUSCLES) o[m.id] = { sets: 0, weekly: 0, weeklyDirect: 0, weeklyIndirect: 0, last: null };
  return o;
}

/**
 * Sayım kuralı (her ekranda aynı): ana kas 1 set, yardımcı kas yarım set.
 * Isınma setleri ve işaretlenmemiş setler sayılmaz.
 */
export function muscleLoadBetween(
  db: DB,
  exMap: Map<string, Exercise>,
  from: string,
  to: string,
  weeks: number,
): Record<MuscleId, MuscleLoad> {
  const out = emptyLoad();
  const all = db.active ? [...db.workouts, db.active] : db.workouts;
  for (const w of all) {
    const inRange = w.date >= from && w.date <= to;
    for (const e of w.entries) {
      const n = doneSets(e).length;
      if (!n) continue;
      const exr = exMap.get(e.exerciseId);
      if (!exr) continue;
      const touch = (m: MuscleId, factor: number) => {
        const o = out[m];
        if (!o) return;
        if (inRange) {
          o.sets += n * factor;
          if (factor === 1) o.weeklyDirect += n;
          else o.weeklyIndirect += n * factor;
        }
        if (w.date <= to && (o.last == null || w.date > o.last)) o.last = w.date;
      };
      exr.primary.forEach((m) => touch(m, 1));
      exr.secondary.forEach((m) => touch(m, 0.5));
    }
  }
  for (const m of MUSCLES) {
    const o = out[m.id];
    o.weekly = o.sets / weeks;
    o.weeklyDirect /= weeks;
    o.weeklyIndirect /= weeks;
  }
  return out;
}

/** Bugün dahil son N gün. */
export function muscleLoad(db: DB, exMap: Map<string, Exercise>, rangeDays: number): Record<MuscleId, MuscleLoad> {
  const today = todayStr();
  return muscleLoadBetween(db, exMap, addDays(today, -(rangeDays - 1)), today, rangeDays / 7);
}

/** Haftalık set hedefi varsayılanları. Büyük kaslar daha yüksek hacim alır. */
export const DEFAULT_TARGETS: Record<MuscleId, MuscleTarget> = {
  chest: { min: 10, max: 20 },
  shoulders: { min: 10, max: 20 },
  lats: { min: 10, max: 20 },
  upperBack: { min: 10, max: 20 },
  quads: { min: 10, max: 20 },
  adductors: { min: 4, max: 12 },
  hamstrings: { min: 8, max: 16 },
  glutes: { min: 8, max: 16 },
  biceps: { min: 8, max: 16 },
  triceps: { min: 8, max: 16 },
  calves: { min: 6, max: 16 },
  abs: { min: 6, max: 16 },
  forearms: { min: 4, max: 12 },
  traps: { min: 4, max: 12 },
  lowerBack: { min: 4, max: 12 },
};

export function targetOf(settings: Settings, m: MuscleId): MuscleTarget {
  return settings.muscleTargets?.[m] ?? DEFAULT_TARGETS[m];
}

export type TargetStatus = 'low' | 'ok' | 'high';

export function targetStatus(weekly: number, t: MuscleTarget): TargetStatus {
  if (weekly < t.min - 0.01) return 'low';
  if (weekly > t.max + 0.01) return 'high';
  return 'ok';
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

// ---------- Haftalık özet ----------

/** Haftanın pazartesi günü. */
export function weekStart(s: string): string {
  const d = parseDate(s);
  const off = (d.getDay() + 6) % 7;
  return addDays(s, -off);
}

export interface WeekSummary {
  count: number;
  goal: number;
  /** Hedefi tutturduğun art arda hafta sayısı. */
  streak: number;
  sets: number;
  /** Geçen haftanın (Pazartesi–Pazar) toplam seti. */
  setsPrev: number;
  cardioCount: number;
  cardioMinutes: number;
}

export function weekSummary(db: DB): WeekSummary {
  const start = weekStart(todayStr());
  const goal = Math.max(1, db.settings.weeklyGoal || 1);
  const perWeek = new Map<string, number>();
  const prevStart = addDays(start, -7);
  let sets = 0;
  let setsPrev = 0;
  for (const w of db.workouts) {
    const k = weekStart(w.date);
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
    if (k === start) sets += workoutStats(w).sets;
    else if (k === prevStart) setsPrev += workoutStats(w).sets;
  }
  const count = perWeek.get(start) ?? 0;
  // Bu hafta henüz dolmadıysa seri bozulmuş sayılmaz; geçmiş haftalara bakılır.
  let streak = count >= goal ? 1 : 0;
  let k = addDays(start, -7);
  while ((perWeek.get(k) ?? 0) >= goal) {
    streak++;
    k = addDays(k, -7);
  }
  const cardio = db.cardio.filter((c) => c.date >= start);
  return {
    count,
    goal,
    streak,
    sets,
    setsPrev,
    cardioCount: cardio.length,
    cardioMinutes: cardio.reduce((a, c) => a + c.minutes, 0),
  };
}

// ---------- Kilo eğilimi ----------

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

/** Son haftalardaki günlük değişim (en küçük kareler eğimi). Veri yetersizse null. */
export function trendPerDay(points: { date: string; value: number }[], windowDays = 28): number | null {
  const pts = points.filter((p) => {
    const a = daysAgo(p.date);
    return a >= 0 && a < windowDays;
  });
  if (pts.length < 3) return null;
  const xs = pts.map((p) => dayNumber(p.date));
  if (Math.max(...xs) - Math.min(...xs) < 6) return null;
  const mx = xs.reduce((a, x) => a + x, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.value, 0) / pts.length;
  let num = 0;
  let den = 0;
  pts.forEach((p, i) => {
    num += (xs[i] - mx) * (p.value - my);
    den += (xs[i] - mx) * (xs[i] - mx);
  });
  return den === 0 ? null : num / den;
}

// ---------- Plaka hesabı ----------

export interface PlateResult {
  /** Barın bir yanına takılacak plakalar, ağırdan hafife. */
  side: number[];
  achieved: number;
  /** İstenen kiloya ulaşmak için eksik kalan miktar. */
  missing: number;
}

export function platesPerSide(total: number, bar: number, plates: number[]): PlateResult {
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  let rem = r3((total - bar) / 2);
  const side: number[] = [];
  if (rem < 0) return { side, achieved: bar, missing: r3(total - bar) };
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (rem >= p - 1e-9) {
      side.push(p);
      rem = r3(rem - p);
    }
  }
  const achieved = r3(bar + 2 * side.reduce((a, p) => a + p, 0));
  return { side, achieved, missing: r3(total - achieved) };
}

// ---------- İstatistik: haftalık seriler ----------
// Hafta her yerde Pazartesi–Pazar'dır. "N hafta" aralığı, içinde bulunulan haftayı
// ve ondan önceki N-1 tam haftayı kapsar.

/** Son N haftanın pazartesileri, eskiden yeniye. */
export function weekStarts(n: number): string[] {
  const cur = weekStart(todayStr());
  return Array.from({ length: n }, (_, i) => addDays(cur, -7 * (n - 1 - i)));
}

/** "16–22 Kas" ya da ay değişiyorsa "30 Kas–6 Ara". */
export function fmtWeek(start: string): string {
  const a = parseDate(start);
  const b = parseDate(addDays(start, 6));
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`;
  return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]}–${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`;
}

export interface WeekPoint {
  start: string;
  workouts: number;
  sets: number;
  volume: number;
}

export function weeklySeries(db: DB, n: number): WeekPoint[] {
  const starts = weekStarts(n);
  const idx = new Map(starts.map((s, i) => [s, i]));
  const out: WeekPoint[] = starts.map((start) => ({ start, workouts: 0, sets: 0, volume: 0 }));
  for (const w of db.workouts) {
    const i = idx.get(weekStart(w.date));
    if (i == null) continue;
    const st = workoutStats(w);
    out[i].workouts++;
    out[i].sets += st.sets;
    out[i].volume += st.volume;
  }
  return out;
}

/** Her kas için, weekStarts(n) ile hizalı haftalık set dizisi. */
export function muscleWeeklySeries(db: DB, exMap: Map<string, Exercise>, n: number): Record<MuscleId, number[]> {
  const starts = weekStarts(n);
  const idx = new Map(starts.map((s, i) => [s, i]));
  const out = {} as Record<MuscleId, number[]>;
  for (const m of MUSCLES) out[m.id] = starts.map(() => 0);
  for (const w of db.workouts) {
    const i = idx.get(weekStart(w.date));
    if (i == null) continue;
    for (const e of w.entries) {
      const c = doneSets(e).length;
      if (!c) continue;
      const exr = exMap.get(e.exerciseId);
      if (!exr) continue;
      for (const m of exr.primary) if (out[m]) out[m][i] += c;
      for (const m of exr.secondary) if (out[m]) out[m][i] += c * 0.5;
    }
  }
  return out;
}

/** Gün başına tamamlanan set sayısı. */
export function dailySets(db: DB): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of db.workouts) m.set(w.date, (m.get(w.date) ?? 0) + workoutStats(w).sets);
  return m;
}

export interface BalancePart {
  label: string;
  value: number;
}

export interface Balance {
  title: string;
  note: string;
  parts: BalancePart[];
}

const sumOf = (sets: Record<MuscleId, number>, ids: MuscleId[]) => ids.reduce((a, m) => a + (sets[m] ?? 0), 0);

/** Kas başına set toplamlarından bölgeler arası denge oranları. */
export function balances(sets: Record<MuscleId, number>): Balance[] {
  const push: MuscleId[] = ['chest', 'shoulders', 'triceps'];
  const pull: MuscleId[] = ['lats', 'upperBack', 'biceps', 'traps', 'forearms'];
  const legs: MuscleId[] = ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'];
  const front: MuscleId[] = ['chest', 'abs', 'quads', 'biceps'];
  const back: MuscleId[] = ['lats', 'upperBack', 'traps', 'lowerBack', 'glutes', 'hamstrings', 'triceps', 'calves'];
  return [
    {
      title: 'İtiş / Çekiş / Bacak',
      note: 'Karın ve bel bu orana dahil değil.',
      parts: [
        { label: 'İtiş', value: sumOf(sets, push) },
        { label: 'Çekiş', value: sumOf(sets, pull) },
        { label: 'Bacak', value: sumOf(sets, legs) },
      ],
    },
    {
      title: 'Üst / Alt vücut',
      note: 'Karın ve bel bu orana dahil değil.',
      parts: [
        { label: 'Üst', value: sumOf(sets, [...push, ...pull]) },
        { label: 'Alt', value: sumOf(sets, legs) },
      ],
    },
    {
      title: 'Ön / Arka',
      note: 'Omuz ve ön kol iki yöne de çalıştığı için dahil değil.',
      parts: [
        { label: 'Ön', value: sumOf(sets, front) },
        { label: 'Arka', value: sumOf(sets, back) },
      ],
    },
  ];
}

export interface RecordRow {
  exerciseId: string;
  metric: Metric;
  best: number;
  bestDate: string;
  /** Verilen tarihten sonra kırılan rekor sayısı. */
  prs: number;
}

/** Egzersiz bazında en iyi derece ve aralıktaki rekor sayısı. İlk seans rekor sayılmaz. */
export function recordRows(index: Map<string, Session[]>, from: string): RecordRow[] {
  const rows: RecordRow[] = [];
  for (const [exerciseId, sessions] of index) {
    const metric = mainMetric(sessions);
    let best = -Infinity;
    let bestDate = sessions[0].date;
    let prs = 0;
    sessions.forEach((s, i) => {
      const v = metricOf(s, metric);
      if (v > best + 0.001) {
        if (i > 0 && s.date >= from) prs++;
        best = v;
        bestDate = s.date;
      }
    });
    rows.push({ exerciseId, metric, best, bestDate, prs });
  }
  return rows.sort((a, b) => (a.bestDate < b.bestDate ? 1 : a.bestDate > b.bestDate ? -1 : 0));
}

// ---------- Egzersiz arama ----------

/** Küçük harfe çevirir, Türkçe harfleri sadeleştirir, noktalama ve tireleri boşluk yapar. */
export function normalizeText(t: string): string {
  return t
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Arama: yazılan her kelime egzersizin adında, diğer adlarında, kaslarında ya da
 * ekipmanında geçmelidir. Kelime sırası ve Türkçe karakter fark etmez.
 */
export function matchesExercise(e: Exercise, query: string): boolean {
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const hay = normalizeText(
    [e.name, ...(e.aliases ?? []), ...e.primary.map((m) => MUSCLE_NAME[m]), EQUIPMENT_NAME[e.equipment]].join(' '),
  );
  return words.every((w) => hay.includes(w));
}

/** Bir hareketin yardımcı kasları, okunur metin olarak. Yoksa boş döner. */
export function secondaryText(e: Exercise | undefined): string {
  return (e?.secondary ?? []).map((m) => MUSCLE_NAME[m]).join(', ');
}
