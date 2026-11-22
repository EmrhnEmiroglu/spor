import { Equipment, Exercise, MuscleId } from '../types';
import { EXTRA, EXTRA_ALIASES } from './exercisesExtra';

/**
 * aliases: aramada eşleşmesi istenen diğer adlar (ör. "single arm row", "tek kol").
 * Kimlikler (id) geçmiş kayıtlarda saklanır; var olan bir kimliği değiştirme.
 */
function ex(
  id: string,
  name: string,
  equipment: Equipment,
  primary: MuscleId[],
  secondary: MuscleId[] = [],
  aliases: string[] = [],
): Exercise {
  return aliases.length ? { id, name, equipment, primary, secondary, aliases } : { id, name, equipment, primary, secondary };
}

/** Elle yazılmış, özenle seçilmiş hareketler. Program şablonları bunları kullanır. */
const BASE: Exercise[] = [
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
  ex('push-up', 'Şınav', 'bodyweight', ['chest'], ['shoulders', 'triceps', 'abs'], ['push up', 'push-up']),
  ex('dips', 'Dips', 'bodyweight', ['chest', 'triceps'], ['shoulders']),

  // Sırt
  ex('deadlift', 'Deadlift', 'barbell', ['lowerBack', 'hamstrings', 'glutes'], ['traps', 'upperBack', 'forearms', 'quads']),
  ex('pull-up', 'Barfiks', 'bodyweight', ['lats'], ['biceps', 'upperBack', 'forearms'], ['pull up', 'pull-up']),
  ex('chin-up', 'Chin-up', 'bodyweight', ['lats', 'biceps'], ['upperBack', 'forearms']),
  ex('lat-pulldown', 'Lat Pulldown', 'cable', ['lats'], ['biceps', 'upperBack']),
  ex('barbell-row', 'Barbell Row', 'barbell', ['upperBack', 'lats'], ['biceps', 'lowerBack', 'forearms']),
  ex('db-row', 'Single Arm Dumbbell Row', 'dumbbell', ['lats', 'upperBack'], ['biceps', 'forearms'], ['dumbbell row', 'one arm row', 'tek kol row']),
  ex('seated-row', 'Seated Cable Row', 'cable', ['upperBack', 'lats'], ['biceps']),
  ex('t-bar-row', 'T-Bar Row', 'barbell', ['upperBack', 'lats'], ['biceps', 'lowerBack']),
  ex('straight-arm-pulldown', 'Straight Arm Pulldown', 'cable', ['lats'], ['triceps'], ['cable pullover', 'lat prayer']),
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
  ex('squat', 'Squat', 'barbell', ['quads', 'glutes'], ['hamstrings', 'adductors', 'lowerBack', 'abs'], ['back squat', 'barbell squat']),
  ex('front-squat', 'Front Squat', 'barbell', ['quads'], ['glutes', 'abs']),
  ex('leg-press', 'Leg Press', 'machine', ['quads'], ['glutes', 'hamstrings']),
  ex('hack-squat', 'Hack Squat', 'machine', ['quads'], ['glutes']),
  ex('leg-extension', 'Leg Extension', 'machine', ['quads']),
  ex('lunge', 'Lunge', 'dumbbell', ['quads', 'glutes'], ['hamstrings', 'adductors']),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'dumbbell', ['quads', 'glutes'], ['hamstrings', 'adductors']),
  ex('goblet-squat', 'Goblet Squat', 'dumbbell', ['quads'], ['glutes', 'abs']),
  ex('rdl', 'Romanian Deadlift', 'barbell', ['hamstrings', 'glutes'], ['lowerBack', 'forearms']),
  ex('sumo-deadlift', 'Sumo Deadlift', 'barbell', ['glutes', 'quads', 'hamstrings'], ['adductors', 'lowerBack', 'traps', 'forearms']),
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
  // ---------- Genişletilmiş kütüphane ----------

  // Sırt
  ex('db-pullover', 'Dumbbell Pullover', 'dumbbell', ['lats', 'chest'], ['triceps'], ['pullover']),
  ex('barbell-pullover', 'Barbell Pullover', 'barbell', ['lats', 'chest'], ['triceps'], ['pullover']),
  ex('machine-pullover', 'Pullover Makinesi', 'machine', ['lats'], ['chest', 'triceps'], ['pullover machine']),
  ex('cable-pullover', 'Cable Pullover (Halat)', 'cable', ['lats'], ['triceps'], ['rope pullover']),
  ex('single-arm-cable-row', 'Single Arm Cable Row', 'cable', ['lats', 'upperBack'], ['biceps'], ['one arm cable row', 'tek kol kablo row']),
  ex('single-arm-lat-pulldown', 'Single Arm Lat Pulldown', 'cable', ['lats'], ['biceps', 'upperBack'], ['one arm pulldown', 'tek kol pulldown']),
  ex('single-arm-machine-row', 'Single Arm Machine Row', 'machine', ['lats', 'upperBack'], ['biceps'], ['iso lateral row', 'hammer row', 'tek kol makine row']),
  ex('machine-row', 'Seated Row Makinesi', 'machine', ['upperBack', 'lats'], ['biceps'], ['machine row']),
  ex('high-row-machine', 'High Row Makinesi', 'machine', ['lats', 'upperBack'], ['biceps'], ['iso lateral high row']),
  ex('low-row-machine', 'Low Row Makinesi', 'machine', ['lats', 'upperBack'], ['biceps']),
  ex('chest-supported-row', 'Chest Supported Row', 'machine', ['upperBack', 'lats'], ['biceps'], ['göğüs destekli row']),
  ex('incline-db-row', 'Incline Dumbbell Row', 'dumbbell', ['upperBack', 'lats'], ['biceps'], ['chest supported dumbbell row']),
  ex('pendlay-row', 'Pendlay Row', 'barbell', ['upperBack', 'lats'], ['biceps', 'lowerBack']),
  ex('meadows-row', 'Meadows Row', 'barbell', ['lats', 'upperBack'], ['biceps', 'forearms'], ['landmine row']),
  ex('seal-row', 'Seal Row', 'barbell', ['upperBack', 'lats'], ['biceps']),
  ex('inverted-row', 'Inverted Row', 'bodyweight', ['upperBack', 'lats'], ['biceps'], ['australian pull up']),
  ex('wide-grip-seated-row', 'Wide Grip Seated Row', 'cable', ['upperBack'], ['lats', 'biceps', 'shoulders']),
  ex('wide-grip-pulldown', 'Wide Grip Lat Pulldown', 'cable', ['lats'], ['biceps', 'upperBack'], ['geniş tutuş pulldown']),
  ex('close-grip-pulldown', 'Close Grip Lat Pulldown', 'cable', ['lats'], ['biceps', 'upperBack'], ['v bar pulldown', 'dar tutuş pulldown']),
  ex('reverse-grip-pulldown', 'Reverse Grip Lat Pulldown', 'cable', ['lats', 'biceps'], ['upperBack'], ['underhand pulldown', 'ters tutuş pulldown']),
  ex('neutral-grip-pull-up', 'Neutral Grip Pull-up', 'bodyweight', ['lats'], ['biceps', 'upperBack', 'forearms'], ['barfiks nötr']),
  ex('assisted-pull-up', 'Assisted Pull-up Makinesi', 'machine', ['lats'], ['biceps', 'upperBack'], ['destekli barfiks']),
  ex('rack-pull', 'Rack Pull', 'barbell', ['lowerBack', 'traps'], ['glutes', 'hamstrings', 'forearms']),
  ex('barbell-shrug', 'Barbell Shrug', 'barbell', ['traps'], ['forearms']),
  ex('back-extension-machine', 'Back Extension Makinesi', 'machine', ['lowerBack'], ['glutes']),
  ex('superman', 'Superman', 'bodyweight', ['lowerBack'], ['glutes']),

  // Göğüs
  ex('incline-db-fly', 'Incline Dumbbell Fly', 'dumbbell', ['chest'], ['shoulders']),
  ex('cable-fly-low-high', 'Cable Fly (Aşağıdan Yukarı)', 'cable', ['chest'], ['shoulders'], ['low to high cable fly', 'üst göğüs fly']),
  ex('cable-fly-high-low', 'Cable Fly (Yukarıdan Aşağı)', 'cable', ['chest'], ['shoulders'], ['high to low cable fly', 'alt göğüs fly']),
  ex('incline-chest-press-machine', 'Incline Chest Press Makinesi', 'machine', ['chest'], ['shoulders', 'triceps']),
  ex('decline-db-press', 'Decline Dumbbell Press', 'dumbbell', ['chest'], ['triceps', 'shoulders']),
  ex('smith-bench', 'Smith Machine Bench Press', 'machine', ['chest'], ['shoulders', 'triceps']),
  ex('smith-incline-bench', 'Smith Machine Incline Press', 'machine', ['chest'], ['shoulders', 'triceps']),
  ex('landmine-press', 'Landmine Press', 'barbell', ['shoulders', 'chest'], ['triceps']),
  ex('diamond-push-up', 'Diamond Şınav', 'bodyweight', ['triceps', 'chest'], ['shoulders'], ['diamond push up']),

  // Omuz
  ex('machine-lateral-raise', 'Lateral Raise Makinesi', 'machine', ['shoulders'], ['traps']),
  ex('cable-front-raise', 'Cable Front Raise', 'cable', ['shoulders']),
  ex('plate-front-raise', 'Plate Front Raise', 'other', ['shoulders'], [], ['plaka front raise']),
  ex('cable-rear-delt-fly', 'Cable Rear Delt Fly', 'cable', ['shoulders'], ['upperBack'], ['arka omuz kablo']),
  ex('smith-shoulder-press', 'Smith Machine Shoulder Press', 'machine', ['shoulders'], ['triceps']),
  ex('push-press', 'Push Press', 'barbell', ['shoulders'], ['triceps', 'quads']),
  ex('y-raise', 'Y Raise', 'dumbbell', ['shoulders'], ['traps', 'upperBack']),

  // Biceps
  ex('ez-bar-curl', 'EZ Bar Curl', 'barbell', ['biceps'], ['forearms'], ['z bar curl']),
  ex('spider-curl', 'Spider Curl', 'dumbbell', ['biceps']),
  ex('bayesian-curl', 'Bayesian Cable Curl', 'cable', ['biceps'], [], ['behind body cable curl']),
  ex('machine-curl', 'Biceps Curl Makinesi', 'machine', ['biceps'], ['forearms'], ['machine preacher curl']),
  ex('rope-hammer-curl', 'Rope Hammer Curl', 'cable', ['biceps', 'forearms'], [], ['cable hammer curl']),
  ex('db-preacher-curl', 'Dumbbell Preacher Curl', 'dumbbell', ['biceps'], ['forearms']),
  ex('drag-curl', 'Drag Curl', 'barbell', ['biceps']),
  ex('zottman-curl', 'Zottman Curl', 'dumbbell', ['biceps', 'forearms']),

  // Triceps
  ex('overhead-cable-ext', 'Overhead Cable Triceps Extension', 'cable', ['triceps'], [], ['rope overhead extension']),
  ex('single-arm-pushdown', 'Single Arm Pushdown', 'cable', ['triceps'], [], ['tek kol pushdown']),
  ex('triceps-dip-machine', 'Triceps Dip Makinesi', 'machine', ['triceps'], ['chest', 'shoulders'], ['seated dip']),
  ex('triceps-ext-machine', 'Triceps Extension Makinesi', 'machine', ['triceps']),
  ex('db-skull-crusher', 'Dumbbell Skull Crusher', 'dumbbell', ['triceps']),
  ex('french-press', 'French Press', 'barbell', ['triceps'], [], ['ez overhead extension']),
  ex('jm-press', 'JM Press', 'barbell', ['triceps'], ['chest']),

  // Ön kol
  ex('reverse-wrist-curl', 'Reverse Wrist Curl', 'dumbbell', ['forearms']),
  ex('dead-hang', 'Dead Hang (saniye)', 'bodyweight', ['forearms'], ['lats'], ['asılma']),

  // Bacak
  ex('smith-squat', 'Smith Machine Squat', 'machine', ['quads', 'glutes'], ['hamstrings', 'adductors']),
  ex('single-leg-press', 'Single Leg Press', 'machine', ['quads'], ['glutes', 'hamstrings'], ['tek bacak leg press']),
  ex('walking-lunge', 'Walking Lunge', 'dumbbell', ['quads', 'glutes'], ['hamstrings', 'adductors']),
  ex('reverse-lunge', 'Reverse Lunge', 'dumbbell', ['quads', 'glutes'], ['hamstrings']),
  ex('split-squat', 'Split Squat', 'dumbbell', ['quads', 'glutes'], ['hamstrings']),
  ex('step-up', 'Step Up', 'dumbbell', ['quads', 'glutes'], ['hamstrings']),
  ex('trap-bar-deadlift', 'Trap Bar Deadlift', 'barbell', ['quads', 'glutes', 'hamstrings'], ['lowerBack', 'traps', 'forearms'], ['hex bar deadlift']),
  ex('db-rdl', 'Dumbbell Romanian Deadlift', 'dumbbell', ['hamstrings', 'glutes'], ['lowerBack', 'forearms'], ['dumbbell rdl']),
  ex('stiff-leg-deadlift', 'Stiff Leg Deadlift', 'barbell', ['hamstrings', 'glutes'], ['lowerBack']),
  ex('single-leg-rdl', 'Single Leg RDL', 'dumbbell', ['hamstrings', 'glutes'], ['lowerBack'], ['tek bacak rdl']),
  ex('nordic-curl', 'Nordic Curl', 'bodyweight', ['hamstrings']),
  ex('glute-bridge', 'Glute Bridge', 'bodyweight', ['glutes'], ['hamstrings']),
  ex('cable-pull-through', 'Cable Pull Through', 'cable', ['glutes', 'hamstrings'], ['lowerBack']),
  ex('kettlebell-swing', 'Kettlebell Swing', 'other', ['glutes', 'hamstrings'], ['lowerBack', 'shoulders']),
  ex('hip-adduction', 'Hip Adduction Makinesi', 'machine', ['adductors'], [], ['iç bacak makinesi', 'adductor']),
  ex('copenhagen-plank', 'Copenhagen Plank (saniye)', 'bodyweight', ['adductors'], ['abs']),
  ex('leg-press-calf-raise', 'Leg Press Calf Raise', 'machine', ['calves']),
  ex('single-leg-calf-raise', 'Single Leg Calf Raise', 'bodyweight', ['calves'], [], ['tek bacak calf raise']),

  // Karın
  ex('hanging-knee-raise', 'Hanging Knee Raise', 'bodyweight', ['abs'], ['forearms']),
  ex('toes-to-bar', 'Toes to Bar', 'bodyweight', ['abs'], ['forearms', 'lats']),
  ex('decline-crunch', 'Decline Crunch', 'bodyweight', ['abs']),
  ex('ab-crunch-machine', 'Karın Makinesi (Crunch)', 'machine', ['abs'], [], ['ab crunch machine']),
  ex('bicycle-crunch', 'Bicycle Crunch', 'bodyweight', ['abs']),
  ex('v-up', 'V-Up', 'bodyweight', ['abs']),
  ex('side-plank', 'Side Plank (saniye)', 'bodyweight', ['abs']),
  ex('cable-woodchopper', 'Cable Woodchopper', 'cable', ['abs'], ['shoulders']),
  ex('pallof-press', 'Pallof Press', 'cable', ['abs']),
];

/**
 * Tüm kütüphane: elle yazılmış hareketler ve açık veri setinden gelenler (kimliği "fx-" ile
 * başlar). Veri setindeki eş adlar, elle yazılmış hareketlere arama için eklenir.
 */
export const LIBRARY: Exercise[] = [
  ...BASE.map((e) => (EXTRA_ALIASES[e.id] ? { ...e, aliases: [...(e.aliases ?? []), ...EXTRA_ALIASES[e.id]] } : e)),
  ...EXTRA,
];

/** Elle yazılmış kütüphaneden mi? Seçicide bunlar veri setinden gelenlerin önünde durur. */
export const isCurated = (e: Exercise) => !e.id.startsWith('fx-');


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
