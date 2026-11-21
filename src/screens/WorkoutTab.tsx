import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Ring } from '../charts';
import { useDB, useExercises } from '../store';
import { useNav } from '../nav';
import { Btn, Card, Icon, IconBtn, Screen, SectionTitle, T, useDialog, useNow } from '../ui';
import { C } from '../theme';
import { PROGRAM_TEMPLATES } from '../data/exercises';
import { MUSCLE_NAME } from '../data/muscles';
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  addTemplate,
  countDone,
  scheduleOf,
  todayPlan,
  weekdayIndex as weekDayIndexOf,
  workoutFromDay,
} from '../actions';
import { addDays, dayMuscles, fmtMinutes, relDay, todayStr, uid, weekStart, weekSummary, workoutStats } from '../logic';
import { ProgramDay } from '../types';

export function WorkoutTab() {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const { map } = useExercises();
  const now = useNow(30000);

  const week = useMemo(() => weekSummary(db), [db]);

  const lastByDay = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of db.workouts) {
      if (!w.dayId) continue;
      const cur = m.get(w.dayId);
      if (!cur || w.date > cur) m.set(w.dayId, w.date);
    }
    return m;
  }, [db.workouts]);

  const plan = useMemo(() => todayPlan(db), [db]);

  const start = async (day: ProgramDay | null) => {
    if (db.active) {
      const ok = await dialog.confirm({
        title: 'Devam eden antrenman var',
        message: 'Yeni antrenman başlatırsan devam eden antrenman kaydedilmeden silinir.',
        confirmLabel: 'Yenisini başlat',
        danger: true,
      });
      if (!ok) return;
    }
    update((d) => {
      d.active = workoutFromDay(day);
    });
    nav.push({ name: 'editor', workoutId: null });
  };

  const newDay = () => {
    const id = uid();
    update((d) => {
      d.days.push({ id, name: `Gün ${d.days.length + 1}`, items: [] });
    });
    nav.push({ name: 'dayEdit', dayId: id });
  };

  const backupDue =
    db.workouts.length >= 3 && (db.settings.lastBackupAt == null || Date.now() - db.settings.lastBackupAt > 14 * 86400000);

  const activeStats = db.active ? workoutStats(db.active, now) : null;

  // Büyük kartta bugünün (plan yoksa sıradaki) günü gösterilir; devam eden antrenman varken gösterilmez.
  const heroDay = plan.kind === 'rotation' || plan.kind === 'today' || plan.kind === 'missed' ? plan.day : null;
  const hero = !db.active && heroDay && heroDay.items.length > 0 ? heroDay : null;
  const heroLabel = plan.kind === 'today' ? 'Bugünkü antrenman' : plan.kind === 'missed' ? 'Dünden kalan antrenman' : 'Sıradaki antrenman';
  const upcoming = plan.kind === 'rest' || plan.kind === 'done' ? plan.next : null;
  const todayIndex = weekDayIndexOf(todayStr());
  const scheduled = plan.kind !== 'rotation';
  const heroMuscles = hero
    ? dayMuscles(hero, map)
        .slice(0, 5)
        .map((m) => MUSCLE_NAME[m])
        .join(', ')
    : '';
  const listed = hero ? db.days.filter((d) => d.id !== hero.id) : db.days;

  const weekDays = useMemo(() => {
    const today = todayStr();
    const start = weekStart(today);
    const worked = new Set(db.workouts.map((w) => w.date));
    const cardio = new Set(db.cardio.map((c) => c.date));
    const sched = scheduleOf(db);
    return WEEKDAY_SHORT.map((label, i) => {
      const date = addDays(start, i);
      return {
        label,
        date,
        workout: worked.has(date),
        cardio: cardio.has(date),
        today: date === today,
        future: date > today,
        planned: sched[i],
      };
    });
  }, [db.workouts, db.cardio, db.days]);

  return (
    <Screen title="Antrenman" right={<IconBtn name="settings" label="Ayarlar" onPress={() => nav.push({ name: 'settings' })} />}>
      <Card style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Ring value={week.count} total={week.goal}>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
              {week.count}
              <Text style={{ color: C.muted, fontSize: 14, fontWeight: '500' }}>/{week.goal}</Text>
            </Text>
          </Ring>
          <View style={{ flex: 1, gap: 3 }}>
            <T v="label">Bu hafta</T>
            <T v="h2">{week.count >= week.goal ? 'Haftalık hedef tamam' : `${week.goal - week.count} antrenman kaldı`}</T>
            <T v="small">
              {week.sets} set · geçen hafta {week.setsPrev}
            </T>
            <T v="small">
              {week.streak > 0 ? `${week.streak} haftadır hedef tutuyor` : 'Henüz seri yok'}
              {week.cardioCount ? ` · ${week.cardioMinutes} dk kardiyo` : ''}
            </T>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {weekDays.map((d) => (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <T v="tiny" color={d.today ? C.text : C.muted} style={{ fontWeight: d.today ? '700' : '400' }}>{d.label}</T>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: d.workout ? C.accent : 'transparent',
                  borderWidth: d.workout ? 0 : d.planned && !d.future && !d.today ? 1 : d.planned ? 1.5 : 1,
                  // Planlı ve henüz gelmemiş günler vurgu rengiyle çerçevelenir.
                  borderColor: d.planned && (d.today || d.future) ? C.accent : d.today ? C.text2 : d.future ? C.border : C.borderStrong,
                }}
              >
                {d.workout ? (
                  <Icon name="check" size={15} color="#ffffff" width={3} />
                ) : d.cardio ? (
                  <Icon name="heart" size={13} color={C.text2} />
                ) : d.planned && !d.future && !d.today ? (
                  <Icon name="minus" size={13} color={C.muted} />
                ) : null}
              </View>
              {scheduled ? (
                <T v="tiny" color={d.planned ? C.text2 : C.muted} style={{ fontSize: 10 }} numberOfLines={1}>
                  {d.planned ? (d.planned.name.trim().split(' ')[0] || 'Gün').slice(0, 6) : '–'}
                </T>
              ) : null}
            </View>
          ))}
        </View>
        {db.days.length ? (
          <Btn
            label={scheduled ? 'Haftalık planı düzenle' : 'Günleri haftaya ata'}
            icon="calendar"
            kind="ghost"
            small
            onPress={() => nav.push({ name: 'schedule' })}
          />
        ) : null}
      </Card>

      {db.active && activeStats ? (
        <Card style={{ borderColor: C.accent, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.good }} />
            <T v="label">Devam ediyor</T>
          </View>
          <T v="h2">{db.active.name}</T>
          <T v="small">
            {fmtMinutes(activeStats.minutes)} · {countDone(db.active)} set tamamlandı
          </T>
          <Btn label="Antrenmana dön" icon="play" onPress={() => nav.push({ name: 'editor', workoutId: null })} />
        </Card>
      ) : null}

      {hero ? (
        <Card style={{ gap: 10, backgroundColor: C.accentDim, borderColor: C.accent }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T v="label" color={C.text2}>{heroLabel}</T>
            <IconBtn name="edit" label="Günü düzenle" color={C.text2} onPress={() => nav.push({ name: 'dayEdit', dayId: hero.id })} />
          </View>
          <T v="h1">{hero.name}</T>
          <T v="small" color={C.text2} numberOfLines={2}>
            {hero.items.length} egzersiz
            {heroMuscles ? ` · ${heroMuscles}` : ''}
          </T>
          <T v="tiny" color={C.text2}>
            {lastByDay.get(hero.id) ? `Son yapılış: ${relDay(lastByDay.get(hero.id) as string).toLocaleLowerCase('tr')}` : 'Henüz yapılmadı'}
          </T>
          <Btn label="Antrenmanı başlat" icon="play" onPress={() => start(hero)} style={{ marginTop: 4 }} />
        </Card>
      ) : null}

      {!db.active && (plan.kind === 'rest' || plan.kind === 'done') ? (
        <Card style={{ gap: 6 }}>
          <T v="label">{plan.kind === 'done' ? 'Bugünkü antrenman tamam' : 'Bugün dinlenme günü'}</T>
          <T v="h2">
            {upcoming
              ? `Sıradaki: ${upcoming.inDays === 1 ? 'Yarın' : WEEKDAY_NAMES[(upcoming.inDays + todayIndex) % 7]} · ${upcoming.day.name}`
              : 'Planlı başka gün yok'}
          </T>
          <T v="small">İstersen aşağıdan bir günü yine de başlatabilirsin.</T>
        </Card>
      ) : null}

      <SectionTitle right={db.days.length ? <Btn label="Gün ekle" icon="plus" kind="ghost" small onPress={newDay} /> : null}>
        {hero ? 'Diğer günler' : 'Programım'}
      </SectionTitle>

      {db.days.length === 0 ? (
        <Card style={{ gap: 12 }}>
          <T v="h2">Programını oluştur</T>
          <T v="small" style={{ lineHeight: 19 }}>
            Hazır bir programla başlayıp sonradan düzenleyebilir ya da günlerini sıfırdan kendin kurabilirsin.
          </T>
          {PROGRAM_TEMPLATES.map((t) => (
            <Card
              key={t.id}
              style={{ backgroundColor: C.surface2, borderColor: C.borderStrong }}
              onPress={() => update((d) => addTemplate(d, t))}
            >
              <T v="h2">{t.name}</T>
              <T v="small" style={{ marginTop: 2 }}>{t.description}</T>
            </Card>
          ))}
          <Btn label="Kendi günümü oluştur" icon="plus" kind="secondary" onPress={newDay} />
        </Card>
      ) : (
        listed.map((day) => {
          const muscles = dayMuscles(day, map)
            .slice(0, 4)
            .map((m) => MUSCLE_NAME[m])
            .join(', ');
          const lastDate = lastByDay.get(day.id);
          return (
            <Card key={day.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T v="h2" style={{ flexShrink: 1 }} numberOfLines={1}>{day.name}</T>
                  </View>
                  <T v="small" numberOfLines={1}>
                    {day.items.length} egzersiz{muscles ? ` · ${muscles}` : ''}
                  </T>
                  <T v="tiny">
                    {day.weekdays?.length ? `${day.weekdays.map((w) => WEEKDAY_SHORT[w]).join(', ')} · ` : ''}
                    {lastDate ? `Son: ${relDay(lastDate)}` : 'Henüz yapılmadı'}
                  </T>
                </View>
                <IconBtn name="edit" label="Günü düzenle" onPress={() => nav.push({ name: 'dayEdit', dayId: day.id })} />
                <Btn label="Başlat" small kind="secondary" onPress={() => start(day)} disabled={day.items.length === 0} />
              </View>
            </Card>
          );
        })
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Btn label="Boş antrenman" kind="secondary" onPress={() => start(null)} style={{ flex: 1 }} />
        <Btn
          label="Kardiyo ekle"
          icon="heart"
          kind="secondary"
          onPress={() => nav.push({ name: 'cardio', id: null, date: todayStr() })}
          style={{ flex: 1 }}
        />
      </View>

      {backupDue ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => nav.push({ name: 'settings' })}>
          <View style={{ flex: 1 }}>
            <T v="body" style={{ fontWeight: '600' }}>Yedek alma zamanı</T>
            <T v="small" style={{ marginTop: 2 }}>Veriler yalnızca bu telefonda duruyor. Ayarlardan yedek al.</T>
          </View>
          <IconBtn name="chevron-right" label="Ayarlar" onPress={() => nav.push({ name: 'settings' })} />
        </Card>
      ) : null}
    </Screen>
  );
}
