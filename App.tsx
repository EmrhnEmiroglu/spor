import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DBProvider, useDB } from './src/store';
import { NavProvider, StackItem, TabId, useNav } from './src/nav';
import { DialogProvider, Icon, IconName, useNow } from './src/ui';
import { C } from './src/theme';
import { fmtClock, fmtMinutes, workoutStats } from './src/logic';
import { TimerProvider, useRestState } from './src/timer';
import { PlatesScreen, SwapScreen } from './src/screens/Tools';
import { CardioScreen, MuscleTargetsScreen } from './src/screens/Extras';
import { WorkoutTab } from './src/screens/WorkoutTab';
import { HistoryTab, WorkoutDetailScreen } from './src/screens/HistoryTab';
import { MusclesTab } from './src/screens/MusclesTab';
import { ExerciseProgressScreen, ProgressTab } from './src/screens/ProgressTab';
import { BodyTab } from './src/screens/BodyTab';
import { EditorScreen } from './src/screens/Editor';
import { NewExerciseScreen, PickerScreen } from './src/screens/Picker';
import { DayEditScreen } from './src/screens/DayEdit';
import { SettingsScreen } from './src/screens/Settings';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'workout', label: 'Antrenman', icon: 'dumbbell' },
  { id: 'history', label: 'Geçmiş', icon: 'calendar' },
  { id: 'muscles', label: 'Kaslar', icon: 'activity' },
  { id: 'progress', label: 'İlerleme', icon: 'trend' },
  { id: 'body', label: 'Vücut', icon: 'user' },
];

function renderRoute(r: StackItem) {
  switch (r.name) {
    case 'editor':
      return <EditorScreen workoutId={r.workoutId} />;
    case 'picker':
      return <PickerScreen target={r.target} />;
    case 'newExercise':
      return <NewExerciseScreen />;
    case 'dayEdit':
      return <DayEditScreen dayId={r.dayId} />;
    case 'workoutDetail':
      return <WorkoutDetailScreen id={r.id} />;
    case 'exerciseProgress':
      return <ExerciseProgressScreen exerciseId={r.exerciseId} />;
    case 'settings':
      return <SettingsScreen />;
    case 'swap':
      return <SwapScreen workoutId={r.workoutId} entryIndex={r.entryIndex} />;
    case 'plates':
      return <PlatesScreen weight={r.weight} />;
    case 'muscleTargets':
      return <MuscleTargetsScreen />;
    case 'cardio':
      return <CardioScreen id={r.id} date={r.date} />;
  }
}

function ActiveBanner() {
  const { db } = useDB();
  const nav = useNav();
  const now = useNow(30000);
  const rest = useRestState();
  if (!db.active || nav.tab === 'workout') return null;
  const s = workoutStats(db.active, now);
  const restText = rest.remaining == null ? '' : rest.finished ? ' · Dinlenme bitti' : ` · Dinlenme ${fmtClock(rest.remaining)}`;
  return (
    <Pressable
      onPress={() => nav.push({ name: 'editor', workoutId: null })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: C.accentDim,
        paddingHorizontal: 16,
        minHeight: 44,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.good }} />
      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={1}>
        {db.active.name} · {fmtMinutes(s.minutes)}
        {restText}
      </Text>
      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Devam et</Text>
      <Icon name="chevron-right" size={16} color={C.text} />
    </Pressable>
  );
}

function TabBar() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderTopWidth: 1,
        borderTopColor: C.border,
        paddingBottom: insets.bottom,
      }}
    >
      {TABS.map((t) => {
        const on = nav.tab === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => nav.setTab(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, gap: 3 }}
          >
            <Icon name={t.icon} size={22} color={on ? C.accent : C.muted} />
            <Text style={{ color: on ? C.text : C.muted, fontSize: 11, fontWeight: on ? '700' : '500' }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Root() {
  const { ready } = useDB();
  const nav = useNav();

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const top = nav.stack.length - 1;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, display: nav.stack.length ? 'none' : 'flex' }}>
        <View style={{ flex: 1 }}>
          {nav.tab === 'workout' ? <WorkoutTab /> : null}
          {nav.tab === 'history' ? <HistoryTab /> : null}
          {nav.tab === 'muscles' ? <MusclesTab /> : null}
          {nav.tab === 'progress' ? <ProgressTab /> : null}
          {nav.tab === 'body' ? <BodyTab /> : null}
        </View>
        <ActiveBanner />
        <TabBar />
      </View>
      {nav.stack.map((r, i) => (
        <View key={r.key} style={[StyleSheet.absoluteFill, { display: i === top ? 'flex' : 'none' }]}>
          {renderRoute(r)}
        </View>
      ))}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <DBProvider>
        <TimerProvider>
          <NavProvider>
            <DialogProvider>
              <Root />
            </DialogProvider>
          </NavProvider>
        </TimerProvider>
      </DBProvider>
    </SafeAreaProvider>
  );
}
