export type MuscleId =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'traps'
  | 'upperBack'
  | 'lats'
  | 'lowerBack'
  | 'glutes'
  | 'quads'
  | 'adductors'
  | 'hamstrings'
  | 'calves';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleId[];
  secondary: MuscleId[];
  equipment: Equipment;
  custom?: boolean;
  /** Aramada eşleşen diğer adlar. */
  aliases?: string[];
}

export interface PlanItem {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
}

export interface ProgramDay {
  id: string;
  name: string;
  items: PlanItem[];
  /** Haftalık planda bu güne atanan hafta günleri: 0 = Pazartesi, 6 = Pazar. */
  weekdays?: number[];
}

export interface SetEntry {
  weight: number | null;
  reps: number | null;
  done: boolean;
  /** Isınma seti: rekor, hacim ve kas haritası hesaplarına girmez. */
  warmup?: boolean;
  /** Set bittiğinde kaç tekrar daha çıkardı (4 = dört ya da fazlası). */
  rir?: number | null;
}

export interface WorkoutEntry {
  exerciseId: string;
  repMin: number;
  repMax: number;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  /** Yerel tarih, YYYY-AA-GG */
  date: string;
  startedAt: number;
  finishedAt: number | null;
  name: string;
  dayId: string | null;
  entries: WorkoutEntry[];
  note: string;
}

export interface WeightLog {
  date: string;
  kg: number;
}

export type MeasureId =
  | 'waist'
  | 'chest'
  | 'shoulders'
  | 'arm'
  | 'forearm'
  | 'hip'
  | 'thigh'
  | 'calf'
  | 'neck';

export interface MeasureLog {
  date: string;
  values: Partial<Record<MeasureId, number>>;
}

export interface MuscleTarget {
  min: number;
  max: number;
}

export interface CardioLog {
  id: string;
  date: string;
  kind: string;
  minutes: number;
  km: number | null;
}

export interface Settings {
  /** Kilo artış adımı (kg) */
  increment: number;
  lastBackupAt: number | null;
  restEnabled: boolean;
  restSeconds: number;
  restSound: boolean;
  /** Set sonunda "kaç tekrar daha çıkardı" sorusu sorulsun mu */
  trackRir: boolean;
  /** Haftalık antrenman hedefi */
  weeklyGoal: number;
  goalWeight: number | null;
  barWeight: number;
  plates: number[];
  /** Trend grafiklerinde gösterilen hafta sayısı: 4, 12, 26 ya da 52 */
  statsRange: number;
  /** Varsayılandan farklı girilen haftalık set hedefleri */
  muscleTargets: Partial<Record<MuscleId, MuscleTarget>>;
}

export interface DB {
  version: 1;
  customExercises: Exercise[];
  days: ProgramDay[];
  workouts: Workout[];
  active: Workout | null;
  weights: WeightLog[];
  measures: MeasureLog[];
  cardio: CardioLog[];
  /** Egzersize özel kalıcı notlar (koltuk ayarı vb.) */
  exerciseNotes: Record<string, string>;
  settings: Settings;
}
