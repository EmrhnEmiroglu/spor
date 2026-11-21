import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useDB, useExercises } from '../store';
import { useNav } from '../nav';
import { Btn, Card, IconBtn, Screen, SectionTitle, StatTile, T, Tag, useDialog, useNow } from '../ui';
import { C } from '../theme';
import { PROGRAM_TEMPLATES } from '../data/exercises';
import { MUSCLE_NAME } from '../data/muscles';
import { addTemplate, countDone, nextDayId, workoutFromDay } from '../actions';
import { dayMuscles, daysAgo, fmtMinutes, relDay, sortWorkouts, todayStr, uid, weekStart, workoutStats } from '../logic';
import { ProgramDay } from '../types';

export function WorkoutTab() {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const { map } = useExercises();
  const now = useNow(30000);

  const week = useMemo(() => {
    const start = weekStart(todayStr());
    const ws = db.workouts.filter((w) => w.date >= start);
    return { count: ws.length, sets: ws.reduce((a, w) => a + workoutStats(w).sets, 0) };
  }, [db.workouts]);

  const last = useMemo(() => {
    const s = sortWorkouts(db.workouts);
    return s.length ? s[s.length - 1] : null;
  }, [db.workouts]);

  const lastByDay = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of db.workouts) {
      if (!w.dayId) continue;
      const cur = m.get(w.dayId);
      if (!cur || w.date > cur) m.set(w.dayId, w.date);
    }
    return m;
  }, [db.workouts]);

  const nextId = useMemo(() => nextDayId(db), [db]);

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
  const lastAgo = last ? daysAgo(last.date) : null;

  return (
    <Screen title="Antrenman" right={<IconBtn name="settings" label="Ayarlar" onPress={() => nav.push({ name: 'settings' })} />}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="Bu hafta" value={String(week.count)} unit="antrenman" />
        <StatTile label="Bu hafta" value={String(week.sets)} unit="set" />
        <StatTile
          label="Son antrenman"
          value={lastAgo == null ? '—' : lastAgo <= 0 ? 'Bugün' : String(lastAgo)}
          unit={lastAgo != null && lastAgo > 0 ? 'gün önce' : undefined}
        />
      </View>

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

      <SectionTitle right={db.days.length ? <Btn label="Gün ekle" icon="plus" kind="ghost" small onPress={newDay} /> : null}>
        Programım
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
        db.days.map((day) => {
          const muscles = dayMuscles(day, map)
            .slice(0, 4)
            .map((m) => MUSCLE_NAME[m])
            .join(', ');
          const lastDate = lastByDay.get(day.id);
          const isNext = day.id === nextId && !db.active;
          return (
            <Card key={day.id} style={isNext ? { borderColor: C.borderStrong } : undefined}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T v="h2" style={{ flexShrink: 1 }} numberOfLines={1}>{day.name}</T>
                    {isNext ? <Tag label="SIRADAKİ" color={C.onAccent} bg={C.accent} /> : null}
                  </View>
                  <T v="small" numberOfLines={1}>
                    {day.items.length} egzersiz{muscles ? ` · ${muscles}` : ''}
                  </T>
                  <T v="tiny">{lastDate ? `Son: ${relDay(lastDate)}` : 'Henüz yapılmadı'}</T>
                </View>
                <IconBtn name="edit" label="Günü düzenle" onPress={() => nav.push({ name: 'dayEdit', dayId: day.id })} />
                <Btn label="Başlat" small kind={isNext ? 'primary' : 'secondary'} onPress={() => start(day)} disabled={day.items.length === 0} />
              </View>
            </Card>
          );
        })
      )}

      <Btn label="Boş antrenman başlat" icon="plus" kind="secondary" onPress={() => start(null)} style={{ marginTop: 4 }} />

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
