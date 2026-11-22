"""
Açık egzersiz veri setini uygulamanın kütüphanesine dönüştürür.

Kaynak: https://github.com/yuhonas/free-exercise-db (Unlicense, kamu malı)
Kullanım:
    python scripts/import-exercises.py <indirilen exercises.json yolu>

Çıktı: src/data/exercisesExtra.ts (elle düzenlenmez, bu betikle yeniden üretilir).

Kurallar:
- Yalnızca kuvvet hareketleri alınır; esneme, kardiyo, sıçrama ve strongman alınmaz.
- Lastik bant, zincir, kızak, pilates topu gibi özel ekipmanlı hareketler alınmaz.
- DUPLICATES içindeki hareketler eklenmez; adları elle yazılmış kütüphanedeki karşılığına
  arama için "diğer ad" olarak bağlanır. Böylece aynı hareketin geçmişi ikiye bölünmez.
- Kimlikler "fx-" ile başlar ve veri setindeki kimlikten türetilir; geçmiş kayıtlar bu
  kimlikleri sakladığı için üretim kuralı değiştirilmemelidir.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "exercisesExtra.ts"

KEEP_CATEGORIES = {"strength", "powerlifting", "olympic weightlifting"}
SKIP_EQUIPMENT = {"bands", "exercise ball", "medicine ball", "foam roll"}
SKIP_NAME = re.compile(
    r"\bbands?\b|\bchains?\b|\bsled\b|\bdrag\b|sprint|crawl|kipping|rocky|gorilla|balance board|"
    r"car drivers|power stairs|\bmanual\b|suspended|\bstraps\b|physioball|bosu|\bball\b|towel|"
    r"london bridges|spell caster|otis-up|rack delivery|power partials|anti-gravity|battling|"
    r"rope climb|plate movers|platform hamstring",
    re.IGNORECASE,
)

MUSCLE = {
    "abdominals": "abs",
    "abductors": "glutes",
    "adductors": "adductors",
    "biceps": "biceps",
    "calves": "calves",
    "chest": "chest",
    "forearms": "forearms",
    "glutes": "glutes",
    "hamstrings": "hamstrings",
    "lats": "lats",
    "lower back": "lowerBack",
    "middle back": "upperBack",
    "quadriceps": "quads",
    "shoulders": "shoulders",
    "traps": "traps",
    "triceps": "triceps",
    # "neck" bilerek yok: uygulamada boyun kas grubu yok.
}

EQUIPMENT = {
    "barbell": "barbell",
    "e-z curl bar": "barbell",
    "dumbbell": "dumbbell",
    "cable": "cable",
    "machine": "machine",
    "body only": "bodyweight",
    "kettlebells": "other",
    "other": "other",
    None: "other",
}

# Veri setindeki ad -> elle yazılmış kütüphanedeki kimlik.
DUPLICATES = {
    # Sırt
    "Chin-Up": "chin-up",
    "Close-Grip Front Lat Pulldown": "close-grip-pulldown",
    "V-Bar Pulldown": "close-grip-pulldown",
    "One Arm Lat Pulldown": "single-arm-lat-pulldown",
    "Pullups": "pull-up",
    "Weighted Pull Ups": "pull-up",
    "Straight-Arm Pulldown": "straight-arm-pulldown",
    "Rope Straight-Arm Pulldown": "cable-pullover",
    "Underhand Cable Pulldowns": "reverse-grip-pulldown",
    "Wide-Grip Lat Pulldown": "wide-grip-pulldown",
    "Full Range-Of-Motion Lat Pulldown": "lat-pulldown",
    "Bent-Arm Barbell Pullover": "barbell-pullover",
    "Leverage Iso Row": "single-arm-machine-row",
    "Bent Over Barbell Row": "barbell-row",
    "One-Arm Dumbbell Row": "db-row",
    "Dumbbell Incline Row": "incline-db-row",
    "Inverted Row": "inverted-row",
    "Leverage High Row": "high-row-machine",
    "Seated Cable Rows": "seated-row",
    "Seated One-arm Cable Pulley Rows": "single-arm-cable-row",
    "T-Bar Row with Handle": "t-bar-row",
    "Bent Over Two-Arm Long Bar Row": "t-bar-row",
    "Bent Over One-Arm Long Bar Row": "meadows-row",
    "One-Arm Long Bar Row": "meadows-row",
    "Barbell Deadlift": "deadlift",
    "Hyperextensions (Back Extensions)": "hyperextension",
    "Rack Pulls": "rack-pull",
    "Barbell Shrug": "barbell-shrug",
    "Dumbbell Shrug": "shrug",
    # Göğüs
    "Barbell Bench Press - Medium Grip": "bench-press",
    "Barbell Incline Bench Press - Medium Grip": "incline-bench",
    "Decline Barbell Bench Press": "decline-bench",
    "Decline Dumbbell Bench Press": "decline-db-press",
    "Dumbbell Bench Press": "db-bench",
    "Dumbbell Flyes": "db-fly",
    "Incline Dumbbell Flyes": "incline-db-fly",
    "Incline Dumbbell Press": "incline-db-press",
    "Butterfly": "pec-deck",
    "Cable Crossover": "cable-crossover",
    "Low Cable Crossover": "cable-fly-low-high",
    "Dips - Chest Version": "dips",
    "Leverage Chest Press": "chest-press-machine",
    "Machine Bench Press": "chest-press-machine",
    "Leverage Incline Chest Press": "incline-chest-press-machine",
    "Pushups": "push-up",
    "Smith Machine Bench Press": "smith-bench",
    "Smith Machine Incline Bench Press": "smith-incline-bench",
    "Bent-Arm Dumbbell Pullover": "db-pullover",
    "Straight-Arm Dumbbell Pullover": "db-pullover",
    # Omuz
    "Arnold Dumbbell Press": "arnold-press",
    "Barbell Shoulder Press": "ohp",
    "Standing Military Press": "ohp",
    "Cable Rear Delt Fly": "cable-rear-delt-fly",
    "Dumbbell Shoulder Press": "db-shoulder-press",
    "Seated Dumbbell Press": "db-shoulder-press",
    "Face Pull": "face-pull",
    "Front Cable Raise": "cable-front-raise",
    "Front Dumbbell Raise": "front-raise",
    "Front Two-Dumbbell Raise": "front-raise",
    "Front Plate Raise": "plate-front-raise",
    "Leverage Shoulder Press": "machine-shoulder-press",
    "Machine Shoulder (Military) Press": "machine-shoulder-press",
    "Push Press": "push-press",
    "Reverse Flyes": "rear-delt-fly",
    "Seated Bent-Over Rear Delt Raise": "rear-delt-fly",
    "Reverse Machine Flyes": "reverse-pec-deck",
    "Side Lateral Raise": "lateral-raise",
    "Smith Machine Overhead Shoulder Press": "smith-shoulder-press",
    "Upright Barbell Row": "upright-row",
    "Standing Low-Pulley Deltoid Raise": "cable-lateral-raise",
    # Biceps
    "Barbell Curl": "barbell-curl",
    "Cable Hammer Curls - Rope Attachment": "rope-hammer-curl",
    "Concentration Curls": "concentration-curl",
    "Drag Curl": "drag-curl",
    "Dumbbell Bicep Curl": "db-curl",
    "Dumbbell Alternate Bicep Curl": "db-curl",
    "EZ-Bar Curl": "ez-bar-curl",
    "Hammer Curls": "hammer-curl",
    "Alternate Hammer Curl": "hammer-curl",
    "Incline Dumbbell Curl": "incline-db-curl",
    "Alternate Incline Dumbbell Curl": "incline-db-curl",
    "Machine Bicep Curl": "machine-curl",
    "Machine Preacher Curls": "machine-curl",
    "Preacher Curl": "preacher-curl",
    "One Arm Dumbbell Preacher Curl": "db-preacher-curl",
    "Two-Arm Dumbbell Preacher Curl": "db-preacher-curl",
    "Reverse Barbell Curl": "reverse-curl",
    "Spider Curl": "spider-curl",
    "Standing Biceps Cable Curl": "cable-curl",
    "Zottman Curl": "zottman-curl",
    # Triceps
    "Bench Dips": "bench-dips",
    "Cable Rope Overhead Triceps Extension": "overhead-cable-ext",
    "Triceps Overhead Extension with Rope": "overhead-cable-ext",
    "Cable One Arm Tricep Extension": "single-arm-pushdown",
    "Close-Grip Barbell Bench Press": "close-grip-bench",
    "Dip Machine": "triceps-dip-machine",
    "Dips - Triceps Version": "dips",
    "Parallel Bar Dip": "dips",
    "EZ-Bar Skullcrusher": "skull-crusher",
    "Lying Triceps Press": "skull-crusher",
    "JM Press": "jm-press",
    "Lying Dumbbell Tricep Extension": "db-skull-crusher",
    "Machine Triceps Extension": "triceps-ext-machine",
    "Standing Dumbbell Triceps Extension": "overhead-triceps-ext",
    "Tricep Dumbbell Kickback": "triceps-kickback",
    "Triceps Pushdown": "triceps-pushdown",
    "Triceps Pushdown - Rope Attachment": "rope-pushdown",
    "Push-Ups - Close Triceps Position": "diamond-push-up",
    "Standing Overhead Barbell Triceps Extension": "french-press",
    # Ön kol
    "Palms-Up Dumbbell Wrist Curl Over A Bench": "wrist-curl",
    "Seated Dumbbell Palms-Up Wrist Curl": "wrist-curl",
    "Seated Dumbbell Palms-Down Wrist Curl": "reverse-wrist-curl",
    # Bacak
    "Barbell Squat": "squat",
    "Barbell Full Squat": "squat",
    "Front Barbell Squat": "front-squat",
    "Goblet Squat": "goblet-squat",
    "Hack Squat": "hack-squat",
    "Leg Extensions": "leg-extension",
    "Leg Press": "leg-press",
    "Dumbbell Lunges": "lunge",
    "Dumbbell Rear Lunge": "reverse-lunge",
    "Dumbbell Step Ups": "step-up",
    "Smith Machine Squat": "smith-squat",
    "Split Squat with Dumbbells": "split-squat",
    "Trap Bar Deadlift": "trap-bar-deadlift",
    "Good Morning": "good-morning",
    "Lying Leg Curls": "leg-curl",
    "Seated Leg Curl": "seated-leg-curl",
    "Romanian Deadlift": "rdl",
    "Stiff-Legged Barbell Deadlift": "stiff-leg-deadlift",
    "Stiff-Legged Dumbbell Deadlift": "db-rdl",
    "Sumo Deadlift": "sumo-deadlift",
    "Kettlebell One-Legged Deadlift": "single-leg-rdl",
    "Natural Glute Ham Raise": "nordic-curl",
    "Floor Glute-Ham Raise": "nordic-curl",
    "Barbell Hip Thrust": "hip-thrust",
    "Butt Lift (Bridge)": "glute-bridge",
    "One-Legged Cable Kickback": "cable-kickback",
    "Pull Through": "cable-pull-through",
    "Seated Calf Raise": "seated-calf-raise",
    "Standing Calf Raises": "calf-raise",
    "Calf Press On The Leg Press Machine": "leg-press-calf-raise",
    "Calf Press": "leg-press-calf-raise",
    "Thigh Adductor": "hip-adduction",
    "Thigh Abductor": "hip-abduction",
    # Karın
    "Ab Crunch Machine": "ab-crunch-machine",
    "Ab Roller": "ab-wheel",
    "Air Bike": "bicycle-crunch",
    "Cable Crunch": "cable-crunch",
    "Rope Crunch": "cable-crunch",
    "Crunches": "crunch",
    "Decline Crunch": "decline-crunch",
    "Hanging Leg Raise": "hanging-leg-raise",
    "Flat Bench Lying Leg Raise": "leg-raise",
    "Pallof Press": "pallof-press",
    "Plank": "plank",
    "Russian Twist": "russian-twist",
    "Side Bridge": "side-plank",
    "Standing Cable Wood Chop": "cable-woodchopper",
    "Jackknife Sit-Up": "v-up",
}

# Veri setindeki hatalı kas atamaları için düzeltmeler: ad -> (ana kaslar, yardımcı kaslar)
OVERRIDES = {
    "Cable Hip Adduction": (["adductors"], []),
}


def clean(text):
    """Denetim karakterlerini atar, boşlukları sadeleştirir."""
    return re.sub(r"\s+", " ", re.sub(r"[\x00-\x1f\x7f]", " ", str(text))).strip()


def main():
    if len(sys.argv) != 2:
        sys.exit("Kullanım: python scripts/import-exercises.py <exercises.json>")
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    if not isinstance(data, list):
        sys.exit("Beklenmeyen biçim: liste değil")

    base_ids = set(re.findall(r"ex\('([^']+)'", (ROOT / "src" / "data" / "exercises.ts").read_text(encoding="utf-8")))
    unknown = sorted({v for v in DUPLICATES.values() if v not in base_ids})
    if unknown:
        sys.exit(f"DUPLICATES içinde kütüphanede olmayan kimlik var: {unknown}")

    extra = []
    aliases = {}
    seen_ids = set()
    seen_names = set()
    skipped = 0
    for rec in data:
        if not isinstance(rec, dict):
            continue
        name = clean(rec.get("name", ""))
        if not name or len(name) > 70:
            continue
        if name in DUPLICATES:
            aliases.setdefault(DUPLICATES[name], []).append(name)
            continue
        if rec.get("category") not in KEEP_CATEGORIES:
            skipped += 1
            continue
        equipment = rec.get("equipment")
        if equipment in SKIP_EQUIPMENT or equipment not in EQUIPMENT or SKIP_NAME.search(name):
            skipped += 1
            continue
        if name in OVERRIDES:
            primary, secondary = OVERRIDES[name]
        else:
            primary = [MUSCLE[m] for m in rec.get("primaryMuscles") or [] if m in MUSCLE]
            secondary = [MUSCLE[m] for m in rec.get("secondaryMuscles") or [] if m in MUSCLE]
        primary = list(dict.fromkeys(primary))
        secondary = [m for m in dict.fromkeys(secondary) if m not in primary]
        if not primary:
            skipped += 1
            continue
        ex_id = "fx-" + re.sub(r"[^a-z0-9]+", "-", str(rec.get("id", name)).lower()).strip("-")
        key = name.lower()
        if ex_id in seen_ids or key in seen_names:
            continue
        seen_ids.add(ex_id)
        seen_names.add(key)
        extra.append({"id": ex_id, "name": name, "equipment": EQUIPMENT[equipment], "primary": primary, "secondary": secondary})

    extra.sort(key=lambda e: e["name"].lower())
    lines = [
        "// Bu dosya scripts/import-exercises.py tarafından üretilir. Elle düzenleme.",
        "// Kaynak: github.com/yuhonas/free-exercise-db (Unlicense, kamu malı).",
        "import { Exercise } from '../types';",
        "",
        "export const EXTRA: Exercise[] = [",
    ]
    lines += ["  " + json.dumps(e, ensure_ascii=False, separators=(",", ":")) + "," for e in extra]
    lines += ["];", "", "/** Veri setindeki adlar, elle yazılmış hareketlere arama için bağlanır. */", "export const EXTRA_ALIASES: Record<string, string[]> = {"]
    lines += [f"  {json.dumps(k)}: {json.dumps(sorted(v), ensure_ascii=False)}," for k, v in sorted(aliases.items())]
    lines += ["};", ""]
    OUT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"eklenen: {len(extra)}, mevcut harekete bağlanan ad: {sum(len(v) for v in aliases.values())}, atlanan: {skipped}")


if __name__ == "__main__":
    main()
