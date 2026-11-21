import React, { useState } from 'react';
import { View } from 'react-native';
import { useDB } from '../store';
import { useNav } from '../nav';
import { Btn, Card, Chip, DatePicker, Empty, NumInput, Screen, Stepper, T, Tag, useDialog } from '../ui';
import { C } from '../theme';
import { WEEKDAY_NAMES, assignWeekday, scheduleOf, weekdayIndex } from '../actions';
import { CARDIO_KINDS, MUSCLES } from '../data/muscles';
import { DEFAULT_TARGETS, fmtNum, targetOf, todayStr, uid } from '../logic';
import { MuscleId } from '../types';

/** Her kas için haftalık set hedef aralığını düzenler. */
export function MuscleTargetsScreen() {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();

  const setTarget = (m: MuscleId, key: 'min' | 'max', n: number) =>
    update((d) => {
      const cur = { ...targetOf(d.settings, m) };
      cur[key] = n;
      d.settings.muscleTargets = { ...d.settings.muscleTargets, [m]: cur };
    });

  const reset = async () => {
    const ok = await dialog.confirm({
      title: 'Varsayılanlara dönülsün mü?',
      message: 'Tüm kaslar için girdiğin hedefler silinir.',
      confirmLabel: 'Sıfırla',
    });
    if (ok) update((d) => void (d.settings.muscleTargets = {}));
  };

  return (
    <Screen title="Haftalık set hedefleri" onBack={nav.pop} overlay right={<Btn label="Tamam" small onPress={nav.pop} />}>
      <T v="small" style={{ lineHeight: 19 }}>
        Her kas için haftada kaç set yapmak istediğini belirle. Kas haritası, hedefin altında kalan ve üstüne çıkan bölgeleri
        gösterir. Ana kas tam set, yardımcı kas yarım set sayılır.
      </T>
      {MUSCLES.map((m) => {
        const t = targetOf(db.settings, m.id);
        const d = DEFAULT_TARGETS[m.id];
        const custom = t.min !== d.min || t.max !== d.max;
        return (
          <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <T v="h2" numberOfLines={1}>{m.name}</T>
              <T v="tiny">{custom ? `Varsayılan ${d.min}–${d.max}` : 'Varsayılan'}</T>
            </View>
            <Stepper label="En az" value={t.min} min={0} max={t.max} onChange={(n) => setTarget(m.id, 'min', n)} />
            <Stepper label="En çok" value={t.max} min={Math.max(1, t.min)} max={40} onChange={(n) => setTarget(m.id, 'max', n)} />
          </Card>
        );
      })}
      <Btn label="Varsayılanlara dön" kind="ghost" onPress={reset} />
    </Screen>
  );
}

/** Kardiyo kaydı ekler ya da düzenler. */
export function CardioScreen({ id, date }: { id: string | null; date: string }) {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const existing = id ? db.cardio.find((c) => c.id === id) : undefined;
  const [kind, setKind] = useState(existing?.kind ?? CARDIO_KINDS[0]);
  const [day, setDay] = useState(existing?.date ?? date);
  const [minutes, setMinutes] = useState<number | null>(existing?.minutes ?? null);
  const [km, setKm] = useState<number | null>(existing?.km ?? null);

  const save = () => {
    if (!minutes || minutes <= 0) return dialog.toast('Süreyi dakika olarak gir.');
    update((d) => {
      const rec = { id: existing?.id ?? uid(), date: day, kind, minutes, km: km && km > 0 ? km : null };
      const i = d.cardio.findIndex((c) => c.id === rec.id);
      if (i >= 0) d.cardio[i] = rec;
      else d.cardio.push(rec);
    });
    nav.pop();
  };

  const remove = async () => {
    const ok = await dialog.confirm({ title: 'Kardiyo kaydı silinsin mi?', confirmLabel: 'Sil', danger: true });
    if (!ok) return;
    update((d) => void (d.cardio = d.cardio.filter((c) => c.id !== id)));
    nav.pop();
  };

  const pace = minutes && km && km > 0 ? minutes / km : null;

  return (
    <Screen title={existing ? 'Kardiyoyu düzenle' : 'Kardiyo ekle'} onBack={nav.pop} overlay footer={<Btn label="Kaydet" onPress={save} />}>
      <Card>
        <DatePicker date={day} onChange={setDay} />
      </Card>
      <T v="label" style={{ marginTop: 4 }}>Tür</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CARDIO_KINDS.map((k) => (
          <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <T v="label">Süre (dk)</T>
          <NumInput value={minutes} onChange={setMinutes} placeholder="30" decimal={false} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <T v="label">Mesafe (km)</T>
          <NumInput value={km} onChange={setKm} placeholder="İsteğe bağlı" />
        </View>
      </View>
      {pace ? <T v="small">Tempo: kilometre başına {fmtNum(pace, 1)} dakika</T> : null}
      {existing ? <Btn label="Kaydı sil" kind="ghost" onPress={remove} style={{ marginTop: 8 }} /> : null}
    </Screen>
  );
}

/** Haftanın her gününe bir program günü atar. Atanmayan günler dinlenme günüdür. */
export function ScheduleScreen() {
  const { db, update } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const sched = scheduleOf(db);
  const todayIdx = weekdayIndex(todayStr());
  const planned = sched.filter((x) => x != null).length;

  const clear = async () => {
    const ok = await dialog.confirm({
      title: 'Haftalık plan temizlensin mi?',
      message: 'Günler yine sırayla dönmeye başlar. Program günlerin ve geçmişin silinmez.',
      confirmLabel: 'Temizle',
    });
    if (ok) update((d) => d.days.forEach((day) => void (day.weekdays = [])));
  };

  if (db.days.length === 0) {
    return (
      <Screen title="Haftalık plan" onBack={nav.pop} overlay>
        <Empty
          icon="calendar"
          title="Önce program günü oluştur"
          text="Ana ekrandan hazır bir program ekle ya da kendi günlerini oluştur. Sonra onları buradan haftanın günlerine atarsın."
        />
      </Screen>
    );
  }

  return (
    <Screen title="Haftalık plan" onBack={nav.pop} overlay right={<Btn label="Tamam" small onPress={nav.pop} />}>
      <T v="small" style={{ lineHeight: 19 }}>
        Her gün için ne yapacağını seç. Seçmediğin günler dinlenme günü olur. Ana ekran o günün antrenmanını gösterir.
      </T>
      {WEEKDAY_NAMES.map((name, i) => {
        const cur = sched[i];
        return (
          <Card key={name} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T v="h2">{name}</T>
              {i === todayIdx ? <Tag label="BUGÜN" color={C.onAccent} bg={C.accent} /> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label="Dinlenme" selected={!cur} onPress={() => update((d) => assignWeekday(d, i, null))} />
              {db.days.map((day) => (
                <Chip
                  key={day.id}
                  label={day.name || 'Adsız gün'}
                  selected={cur?.id === day.id}
                  onPress={() => update((d) => assignWeekday(d, i, day.id))}
                />
              ))}
            </View>
          </Card>
        );
      })}
      <T v="tiny" style={{ lineHeight: 17 }}>
        {planned > 0
          ? `Haftada ${planned} antrenman planlandı. Haftalık hedefin de ${planned} olarak ayarlandı.`
          : 'Hiçbir güne atama yapılmadı. Bu durumda günler sırayla döner.'}
      </T>
      {planned > 0 ? <Btn label="Planı temizle" kind="ghost" onPress={clear} /> : null}
    </Screen>
  );
}
