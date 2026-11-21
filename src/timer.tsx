import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { fmtClock } from './logic';
import { useDB } from './store';

// ---------- Ses ----------

let audio: any = null;

/**
 * Tarayıcılar sesi ancak kullanıcı dokunuşuyla açar. Set işaretlenirken çağrılır ki
 * süre dolduğunda uyarı sesi çalabilsin.
 */
export function primeAudio(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    audio = audio ?? new AC();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    // ses desteklenmiyorsa sessiz devam et
  }
}

function beep(): void {
  if (Platform.OS !== 'web') {
    Vibration.vibrate(400);
    return;
  }
  if (!audio) return;
  try {
    const t = audio.currentTime;
    for (const off of [0, 0.25, 0.5]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t + off);
      gain.gain.exponentialRampToValueAtTime(0.3, t + off + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.2);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t + off);
      osc.stop(t + off + 0.22);
    }
  } catch {
    // yok say
  }
}

// ---------- Sayaç durumu ----------

interface Actions {
  start: (seconds: number) => void;
  add: (delta: number) => void;
  stop: () => void;
}

interface State {
  /** Kalan saniye. Sayaç yoksa null. */
  remaining: number | null;
  total: number;
  finished: boolean;
}

const ActionsContext = createContext<Actions | null>(null);
const StateContext = createContext<State>({ remaining: null, total: 0, finished: false });

/** Süre dolduktan sonra "bitti" bildirimi ekranda bu kadar kalır. */
const LINGER_MS = 20000;

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { db } = useDB();
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  const sound = useRef(db.settings.restSound);
  sound.current = db.settings.restSound;

  const start = useCallback((seconds: number) => {
    fired.current = false;
    setTotal(seconds);
    setNow(Date.now());
    setEndsAt(Date.now() + seconds * 1000);
  }, []);

  const add = useCallback((delta: number) => {
    setEndsAt((e) => (e == null ? e : Math.max(Date.now(), e + delta * 1000)));
    setTotal((t) => Math.max(1, t + delta));
    fired.current = false;
  }, []);

  const stop = useCallback(() => setEndsAt(null), []);

  // Saat farkına göre hesaplandığı için uygulama arka plana gidip gelse de süre doğru kalır.
  useEffect(() => {
    if (endsAt == null) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endsAt && !fired.current) {
        fired.current = true;
        if (sound.current) beep();
      }
      if (n >= endsAt + LINGER_MS) setEndsAt(null);
    }, 250);
    return () => clearInterval(t);
  }, [endsAt]);

  const actions = useMemo(() => ({ start, add, stop }), [start, add, stop]);
  const state = useMemo<State>(() => {
    if (endsAt == null) return { remaining: null, total: 0, finished: false };
    const remaining = Math.max(0, (endsAt - now) / 1000);
    return { remaining, total, finished: remaining <= 0 };
  }, [endsAt, now, total]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useRestActions(): Actions {
  const c = useContext(ActionsContext);
  if (!c) throw new Error('TimerProvider eksik');
  return c;
}

export function useRestState(): State {
  return useContext(StateContext);
}

// ---------- Görünüm ----------

function BarBtn({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 52,
        minHeight: 40,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: strong ? C.accent : C.surface3,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: strong ? C.onAccent : C.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/** Antrenman ekranının altında duran dinlenme sayacı. Sayaç yokken hiçbir şey çizmez. */
export function RestBar() {
  const { remaining, total, finished } = useRestState();
  const { add, stop } = useRestActions();
  const insets = useSafeAreaInsets();
  if (remaining == null) return null;
  const pct = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  return (
    <View style={{ backgroundColor: finished ? C.goodDim : C.surface, borderTopWidth: 1, borderTopColor: C.borderStrong, paddingBottom: insets.bottom }}>
      <View style={{ height: 3, backgroundColor: C.surface3 }}>
        <View style={{ height: 3, width: `${pct * 100}%`, backgroundColor: C.accent }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text2, fontSize: 12 }}>{finished ? 'Dinlenme bitti' : 'Dinlenme'}</Text>
          <Text style={{ color: C.text, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {finished ? 'Sıradaki set' : fmtClock(remaining)}
          </Text>
        </View>
        {finished ? (
          <BarBtn label="Tamam" onPress={stop} strong />
        ) : (
          <>
            <BarBtn label="−15" onPress={() => add(-15)} />
            <BarBtn label="+15" onPress={() => add(15)} />
            <BarBtn label="Geç" onPress={stop} />
          </>
        )}
      </View>
    </View>
  );
}
