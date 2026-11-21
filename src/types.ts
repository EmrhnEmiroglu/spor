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
}

export interface SetEntry {
  weight: number | null;
  reps: number | null;
  done: boolean;
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

export interface Settings {
  /** Kilo artış adımı (kg) */
  increment: number;
  lastBackupAt: number | null;
}

export interface DB {
  version: 1;
  customExercises: Exercise[];
  days: ProgramDay[];
  workouts: Workout[];
  active: Workout | null;
  weights: WeightLog[];
  measures: MeasureLog[];
  settings: Settings;
}
