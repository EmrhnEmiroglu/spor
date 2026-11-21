import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { emptyDB, useDB } from '../store';
import { useNav } from '../nav';
import { Btn, Card, Chip, Field, Screen, SectionTitle, Stepper, T, ToggleRow, useDialog } from '../ui';
import { exportBackup, parseBackup, pickBackupFile } from '../backup';
import { fmtClock, fmtDate, fmtNum, toDateStr } from '../logic';
import { DB } from '../types';

export function SettingsScreen() {
  const { db, update, replaceAll } = useDB();
  const nav = useNav();
  const dialog = useDialog();
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState('');

  const doExport = async () => {
    const r = await exportBackup(db);
    if (r === 'failed') return dialog.toast('Yedek alınamadı.');
    if (r === 'cancelled') return;
    update((d) => {
      d.settings.lastBackupAt = Date.now();
    });
    dialog.toast(r === 'downloaded' ? 'Yedek dosyası indirildi.' : 'Yedek paylaşıldı.');
  };

  const restore = async (incoming: DB | null) => {
    if (!incoming) return dialog.toast('Bu dosya geçerli bir yedek değil.');
    const ok = await dialog.confirm({
      title: 'Yedek geri yüklensin mi?',
      message: `Yedekte ${incoming.workouts.length} antrenman var. Şu anki tüm verilerin yerine yedekteki veriler gelir.`,
      confirmLabel: 'Geri yükle',
      danger: true,
    });
    if (!ok) return;
    replaceAll(incoming);
    setText('');
    setPaste(false);
    dialog.toast('Yedek geri yüklendi.');
  };

  const fromFile = async () => {
    const t = await pickBackupFile();
    if (t != null) restore(parseBackup(t));
  };

  const wipe = async () => {
    const ok = await dialog.confirm({
      title: 'Tüm veriler silinsin mi?',
      message: 'Antrenmanlar, program, kilo ve ölçü kayıtları kalıcı olarak silinir. Önce yedek almanı öneririm.',
      confirmLabel: 'Hepsini sil',
      danger: true,
    });
    if (!ok) return;
    const again = await dialog.confirm({
      title: 'Emin misin?',
      message: 'Bu işlem geri alınamaz.',
      confirmLabel: 'Evet, sil',
      danger: true,
    });
    if (again) {
      replaceAll(emptyDB());
      dialog.toast('Tüm veriler silindi.');
    }
  };

  const last = db.settings.lastBackupAt;

  return (
    <Screen title="Ayarlar" onBack={nav.pop} overlay>
      <SectionTitle>Haftalık hedef</SectionTitle>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T v="body">Haftada antrenman</T>
          <T v="tiny" style={{ marginTop: 2, lineHeight: 16 }}>Ana ekrandaki sayaç ve seri bu hedefe göre hesaplanır.</T>
        </View>
        <Stepper value={db.settings.weeklyGoal} min={1} max={7} onChange={(n) => update((d) => void (d.settings.weeklyGoal = n))} />
      </Card>

      <SectionTitle>Dinlenme sayacı</SectionTitle>
      <Card style={{ gap: 10 }}>
        <ToggleRow
          label="Set bitince sayacı başlat"
          value={db.settings.restEnabled}
          onChange={(v) => update((d) => void (d.settings.restEnabled = v))}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[60, 90, 120, 150, 180, 240].map((n) => (
            <Chip
              key={n}
              label={fmtClock(n)}
              selected={db.settings.restSeconds === n}
              onPress={() => update((d) => void (d.settings.restSeconds = n))}
            />
          ))}
        </View>
        <ToggleRow
          label="Süre dolunca ses çal"
          hint="Telefon sessizdeyken ve ekran kilitliyken ses çıkmaz."
          value={db.settings.restSound}
          onChange={(v) => update((d) => void (d.settings.restSound = v))}
        />
      </Card>

      <SectionTitle>Set zorluğu</SectionTitle>
      <Card>
        <ToggleRow
          label="Set sonunda zorluğu sor"
          hint="Kaç tekrar daha çıkaracağını girersen kilo artırma önerisi daha isabetli olur."
          value={db.settings.trackRir}
          onChange={(v) => update((d) => void (d.settings.trackRir = v))}
        />
      </Card>

      <SectionTitle>Kilo artış adımı</SectionTitle>
      <Card style={{ gap: 10 }}>
        <T v="small" style={{ lineHeight: 19 }}>
          Tekrar aralığını doldurduğunda önerilen kilo artışı. Salonundaki en küçük plaka çiftine göre seç.
        </T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1.25, 2.5, 5].map((n) => (
            <Chip
              key={n}
              label={`${fmtNum(n)} kg`}
              selected={db.settings.increment === n}
              onPress={() => update((d) => void (d.settings.increment = n))}
            />
          ))}
        </View>
      </Card>

      <SectionTitle>Yedekleme</SectionTitle>
      <Card style={{ gap: 10 }}>
        <T v="small" style={{ lineHeight: 19 }}>
          Veriler yalnızca bu cihazda saklanır. Uygulamayı ana ekrandan silersen veriler de silinir. Düzenli yedek al ve dosyayı
          güvenli bir yere kaydet.
        </T>
        <T v="tiny">{last ? `Son yedek: ${fmtDate(toDateStr(new Date(last)), 'long')}` : 'Henüz yedek alınmadı.'}</T>
        <Btn label="Yedek al" icon="download" onPress={doExport} />
        {Platform.OS === 'web' ? <Btn label="Dosyadan geri yükle" icon="upload" kind="secondary" onPress={fromFile} /> : null}
        <Btn
          label={paste ? 'Yapıştırma alanını kapat' : 'Metin yapıştırarak geri yükle'}
          kind="ghost"
          small
          onPress={() => setPaste((p) => !p)}
        />
        {paste ? (
          <>
            <Field value={text} onChangeText={setText} placeholder="Yedek dosyasının içeriğini buraya yapıştır" multiline />
            <Btn label="Yapıştırılanı geri yükle" kind="secondary" disabled={!text.trim()} onPress={() => restore(parseBackup(text))} />
          </>
        ) : null}
      </Card>

      <SectionTitle>Veriler</SectionTitle>
      <Card style={{ gap: 6 }}>
        <T v="small">
          {db.workouts.length} antrenman · {db.days.length} program günü · {db.customExercises.length} özel egzersiz
        </T>
        <T v="small">
          {db.weights.length} kilo kaydı · {db.measures.length} ölçü kaydı · {db.cardio.length} kardiyo kaydı
        </T>
        <Btn label="Tüm verileri sil" kind="danger" onPress={wipe} style={{ marginTop: 8 }} />
      </Card>
    </Screen>
  );
}
