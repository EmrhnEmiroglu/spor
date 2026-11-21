import { Equipment, Exercise, MuscleId } from '../types';

function ex(id: string, name: string, equipment: Equipment, primary: MuscleId[], secondary: MuscleId[] = []): Exercise {
  return { id, name, equipment, primary, secondary };
}

export const LIBRARY: Exercise[] = [
  // Göğüs
  ex('bench-press', 'Bench Press', 'barbell', ['chest'], ['shoulders', 'triceps']),
  ex('incline-bench', 'Incline Bench Press', 'barbell', ['chest'], ['shoulders', 'triceps']),
  ex('decline-bench', 'Decline Bench Press', 'barbell', ['chest'], ['triceps']),
  ex('db-bench', 'Dumbbell Press', 'dumbbell', ['chest'], ['shoulders', 'triceps']),
  ex('incline-db-press', 'Incline Dumbbell Press', 'dumbbell', ['chest'], ['shoulders', 'triceps']),
  ex('db-fly', 'Dumbbell Fly', 'dumbbell', ['chest'], ['shoulders']),
  ex('cable-crossover', 'Cable Crossover', 'cable', ['chest'], ['shoulders']),
  ex('pec-deck', 'Pec Deck (Butterfly)', 'machine', ['chest']),
  ex('chest-press-machine', 'Chest Press Makinesi', 'machine', ['chest'], ['shoulders', 'triceps']),
  ex('push-up', 'Şınav', 'bodyweight', ['chest'], ['shoulders', 'triceps', 'abs']),
  ex('dips', 'Dips', 'bodyweight', ['chest', 'triceps'], ['shoulders']),

  // Sırt
  ex('deadlift', 'Deadlift', 'barbell', ['lowerBack', 'hamstrings', 'glutes'], ['traps', 'upperBack', 'forearms', 'quads']),
  ex('pull-up', 'Barfiks', 'bodyweight', ['lats'], ['biceps', 'upperBack', 'forearms']),
  ex('chin-up', 'Chin-up', 'bodyweight', ['lats', 'biceps'], ['upperBack', 'forearms']),
  ex('lat-pulldown', 'Lat Pulldown', 'cable', ['lats'], ['biceps', 'upperBack']),
  ex('barbell-row', 'Barbell Row', 'barbell', ['upperBack', 'lats'], ['biceps', 'lowerBack', 'forearms']),
  ex('db-row', 'Dumbbell Row', 'dumbbell', ['lats', 'upperBack'], ['biceps', 'forearms']),
  ex('seated-row', 'Seated Cable Row', 'cable', ['upperBack', 'lats'], ['biceps']),
  ex('t-bar-row', 'T-Bar Row', 'barbell', ['upperBack', 'lats'], ['biceps', 'lowerBack']),
  ex('straight-arm-pulldown', 'Straight Arm Pulldown', 'cable', ['lats'], ['triceps']),
  ex('face-pull', 'Face Pull', 'cable', ['shoulders', 'upperBack'], ['traps']),
  ex('shrug', 'Shrug', 'dumbbell', ['traps'], ['forearms']),
  ex('hyperextension', 'Hyperextension', 'bodyweight', ['lowerBack'], ['glutes', 'hamstrings']),

  // Omuz
  ex('ohp', 'Overhead Press', 'barbell', ['shoulders'], ['triceps', 'traps']),
  ex('db-shoulder-press', 'Dumbbell Shoulder Press', 'dumbbell', ['shoulders'], ['triceps']),
  ex('machine-shoulder-press', 'Shoulder Press Makinesi', 'machine', ['shoulders'], ['triceps']),
  ex('arnold-press', 'Arnold Press', 'dumbbell', ['shoulders'], ['triceps']),
  ex('lateral-raise', 'Lateral Raise', 'dumbbell', ['shoulders'], ['traps']),
  ex('cable-lateral-raise', 'Cable Lateral Raise', 'cable', ['shoulders'], ['traps']),
  ex('front-raise', 'Front Raise', 'dumbbell', ['shoulders']),
  ex('rear-delt-fly', 'Reverse Fly (Arka Omuz)', 'dumbbell', ['shoulders'], ['upperBack']),
  ex('reverse-pec-deck', 'Reverse Pec Deck', 'machine', ['shoulders'], ['upperBack']),
  ex('upright-row', 'Upright Row', 'barbell', ['shoulders', 'traps'], ['biceps']),

  // Biceps
  ex('barbell-curl', 'Barbell Curl', 'barbell', ['biceps'], ['forearms']),
  ex('db-curl', 'Dumbbell Curl', 'dumbbell', ['biceps'], ['forearms']),
  ex('hammer-curl', 'Hammer Curl', 'dumbbell', ['biceps', 'forearms']),
  ex('preacher-curl', 'Preacher Curl', 'barbell', ['biceps'], ['forearms']),
  ex('incline-db-curl', 'Incline Dumbbell Curl', 'dumbbell', ['biceps']),
  ex('cable-curl', 'Cable Curl', 'cable', ['biceps'], ['forearms']),
  ex('concentration-curl', 'Concentration Curl', 'dumbbell', ['biceps']),

  // Triceps
  ex('triceps-pushdown', 'Triceps Pushdown', 'cable', ['triceps']),
  ex('rope-pushdown', 'Rope Pushdown', 'cable', ['triceps']),
  ex('skull-crusher', 'Skull Crusher', 'barbell', ['triceps']),
  ex('overhead-triceps-ext', 'Overhead Triceps Extension', 'dumbbell', ['triceps']),
  ex('close-grip-bench', 'Close Grip Bench Press', 'barbell', ['triceps'], ['chest', 'shoulders']),
  ex('bench-dips', 'Bench Dips', 'bodyweight', ['triceps'], ['shoulders', 'chest']),
  ex('triceps-kickback', 'Triceps Kickback', 'dumbbell', ['triceps']),

  // Ön kol
  ex('wrist-curl', 'Wrist Curl', 'dumbbell', ['forearms']),
  ex('reverse-curl', 'Reverse Curl', 'barbell', ['forearms'], ['biceps']),
  ex('farmers-walk', "Farmer's Walk", 'dumbbell', ['forearms', 'traps'], ['abs']),

  // Bacak
  ex('squat', 'Squat', 'barbell', ['quads', 'glutes'], ['hamstrings', 'lowerBack', 'abs']),
  ex('front-squat', 'Front Squat', 'barbell', ['quads'], ['glutes', 'abs']),
  ex('leg-press', 'Leg Press', 'machine', ['quads'], ['glutes', 'hamstrings']),
  ex('hack-squat', 'Hack Squat', 'machine', ['quads'], ['glutes']),
  ex('leg-extension', 'Leg Extension', 'machine', ['quads']),
  ex('lunge', 'Lunge', 'dumbbell', ['quads', 'glutes'], ['hamstrings']),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'dumbbell', ['quads', 'glutes'], ['hamstrings']),
  ex('goblet-squat', 'Goblet Squat', 'dumbbell', ['quads'], ['glutes', 'abs']),
  ex('rdl', 'Romanian Deadlift', 'barbell', ['hamstrings', 'glutes'], ['lowerBack', 'forearms']),
  ex('sumo-deadlift', 'Sumo Deadlift', 'barbell', ['glutes', 'quads', 'hamstrings'], ['lowerBack', 'traps', 'forearms']),
  ex('good-morning', 'Good Morning', 'barbell', ['hamstrings', 'lowerBack'], ['glutes']),
  ex('leg-curl', 'Leg Curl (Yatarak)', 'machine', ['hamstrings'], ['calves']),
  ex('seated-leg-curl', 'Seated Leg Curl', 'machine', ['hamstrings']),
  ex('hip-thrust', 'Hip Thrust', 'barbell', ['glutes'], ['hamstrings']),
  ex('cable-kickback', 'Cable Kickback', 'cable', ['glutes']),
  ex('hip-abduction', 'Hip Abduction Makinesi', 'machine', ['glutes']),
  ex('calf-raise', 'Calf Raise (Ayakta)', 'machine', ['calves']),
  ex('seated-calf-raise', 'Seated Calf Raise', 'machine', ['calves']),

  // Karın
  ex('crunch', 'Crunch (Mekik)', 'bodyweight', ['abs']),
  ex('cable-crunch', 'Cable Crunch', 'cable', ['abs']),
  ex('leg-raise', 'Leg Raise', 'bodyweight', ['abs']),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'bodyweight', ['abs'], ['forearms']),
  ex('plank', 'Plank (saniye)', 'bodyweight', ['abs'], ['lowerBack']),
  ex('russian-twist', 'Russian Twist', 'bodyweight', ['abs']),
  ex('ab-wheel', 'Ab Wheel', 'other', ['abs'], ['lats', 'shoulders']),
];

type TItem = [exerciseId: string, sets: number, repMin: number, repMax: number];

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  days: { name: string; items: TItem[] }[];
}

const LEGS: TItem[] = [
  ['squat', 4, 6, 10],
  ['rdl', 3, 8, 12],
  ['leg-press', 3, 10, 12],
  ['leg-curl', 3, 10, 15],
  ['leg-extension', 3, 12, 15],
  ['calf-raise', 4, 10, 15],
];

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'ppl',
    name: 'İtiş / Çekiş / Bacak',
    description: '3 gün. Haftada 3 ya da 6 antrenman yapanlar için.',
    days: [
      {
        name: 'İtiş',
        items: [
          ['bench-press', 4, 6, 10],
          ['incline-db-press', 3, 8, 12],
          ['ohp', 3, 6, 10],
          ['lateral-raise', 4, 12, 15],
          ['triceps-pushdown', 3, 10, 15],
          ['overhead-triceps-ext', 3, 10, 15],
        ],
      },
      {
        name: 'Çekiş',
        items: [
          ['barbell-row', 4, 6, 10],
          ['lat-pulldown', 3, 8, 12],
          ['seated-row', 3, 8, 12],
          ['face-pull', 3, 12, 15],
          ['barbell-curl', 3, 8, 12],
          ['hammer-curl', 3, 10, 12],
        ],
      },
      { name: 'Bacak', items: LEGS },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Üst / Alt',
    description: '2 gün. Haftada 2 ya da 4 antrenman yapanlar için.',
    days: [
      {
        name: 'Üst vücut',
        items: [
          ['bench-press', 4, 6, 10],
          ['barbell-row', 4, 6, 10],
          ['db-shoulder-press', 3, 8, 12],
          ['lat-pulldown', 3, 8, 12],
          ['lateral-raise', 3, 12, 15],
          ['barbell-curl', 3, 10, 12],
          ['triceps-pushdown', 3, 10, 12],
        ],
      },
      {
        name: 'Alt vücut',
        items: [
          ['squat', 4, 6, 10],
          ['rdl', 3, 8, 12],
          ['leg-press', 3, 10, 12],
          ['leg-curl', 3, 10, 15],
          ['calf-raise', 4, 10, 15],
          ['hanging-leg-raise', 3, 10, 15],
        ],
      },
    ],
  },
  {
    id: 'split',
    name: 'Bölgesel',
    description: '5 gün. Her gün tek bölge çalışanlar için.',
    days: [
      {
        name: 'Göğüs',
        items: [
          ['bench-press', 4, 6, 10],
          ['incline-db-press', 4, 8, 12],
          ['cable-crossover', 3, 12, 15],
          ['dips', 3, 8, 12],
        ],
      },
      {
        name: 'Sırt',
        items: [
          ['pull-up', 4, 6, 10],
          ['barbell-row', 4, 6, 10],
          ['lat-pulldown', 3, 8, 12],
          ['seated-row', 3, 8, 12],
          ['hyperextension', 3, 12, 15],
        ],
      },
      {
        name: 'Omuz',
        items: [
          ['ohp', 4, 6, 10],
          ['lateral-raise', 4, 12, 15],
          ['rear-delt-fly', 3, 12, 15],
          ['shrug', 3, 10, 12],
        ],
      },
      {
        name: 'Kol',
        items: [
          ['barbell-curl', 4, 8, 12],
          ['skull-crusher', 4, 8, 12],
          ['hammer-curl', 3, 10, 12],
          ['triceps-pushdown', 3, 10, 12],
        ],
      },
      { name: 'Bacak', items: LEGS },
    ],
  },
];
