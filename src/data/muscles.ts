import { Equipment, MeasureId, MuscleId } from '../types';

export const MUSCLES: { id: MuscleId; name: string }[] = [
  { id: 'chest', name: 'Göğüs' },
  { id: 'shoulders', name: 'Omuz' },
  { id: 'biceps', name: 'Biceps' },
  { id: 'triceps', name: 'Triceps' },
  { id: 'forearms', name: 'Ön kol' },
  { id: 'abs', name: 'Karın' },
  { id: 'traps', name: 'Trapez' },
  { id: 'upperBack', name: 'Üst sırt' },
  { id: 'lats', name: 'Kanat' },
  { id: 'lowerBack', name: 'Bel' },
  { id: 'glutes', name: 'Kalça' },
  { id: 'quads', name: 'Ön bacak' },
  { id: 'adductors', name: 'İç bacak' },
  { id: 'hamstrings', name: 'Arka bacak' },
  { id: 'calves', name: 'Baldır' },
];

export const MUSCLE_NAME = Object.fromEntries(MUSCLES.map((m) => [m.id, m.name])) as Record<MuscleId, string>;

export const EQUIPMENT: { id: Equipment; name: string }[] = [
  { id: 'barbell', name: 'Bar' },
  { id: 'dumbbell', name: 'Dambıl' },
  { id: 'machine', name: 'Makine' },
  { id: 'cable', name: 'Kablo' },
  { id: 'bodyweight', name: 'Vücut ağırlığı' },
  { id: 'other', name: 'Diğer' },
];

export const EQUIPMENT_NAME = Object.fromEntries(EQUIPMENT.map((m) => [m.id, m.name])) as Record<Equipment, string>;

export const CARDIO_KINDS = ['Koşu', 'Yürüyüş', 'Bisiklet', 'Eliptik', 'Kürek', 'Yüzme', 'İp atlama', 'Diğer'];

export const MEASURES: { id: MeasureId; name: string }[] = [
  { id: 'waist', name: 'Bel' },
  { id: 'chest', name: 'Göğüs' },
  { id: 'shoulders', name: 'Omuz' },
  { id: 'arm', name: 'Kol' },
  { id: 'forearm', name: 'Ön kol' },
  { id: 'hip', name: 'Kalça' },
  { id: 'thigh', name: 'Bacak' },
  { id: 'calf', name: 'Baldır' },
  { id: 'neck', name: 'Boyun' },
];
