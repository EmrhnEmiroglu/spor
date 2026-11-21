import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { uid } from './logic';

export type PickerTarget = { kind: 'workout'; workoutId: string | null } | { kind: 'day'; dayId: string };

export type Route =
  | { name: 'editor'; workoutId: string | null }
  | { name: 'picker'; target: PickerTarget }
  | { name: 'newExercise' }
  | { name: 'dayEdit'; dayId: string }
  | { name: 'workoutDetail'; id: string; fresh?: boolean }
  | { name: 'exerciseProgress'; exerciseId: string }
  | { name: 'settings' }
  | { name: 'swap'; workoutId: string | null; entryIndex: number }
  | { name: 'plates'; weight: number | null }
  | { name: 'muscleTargets' }
  | { name: 'schedule' }
  | { name: 'cardio'; id: string | null; date: string };

export type StackItem = Route & { key: string };
export type TabId = 'workout' | 'history' | 'muscles' | 'progress' | 'body';

interface Ctx {
  tab: TabId;
  setTab: (t: TabId) => void;
  stack: StackItem[];
  push: (r: Route) => void;
  pop: () => void;
  replace: (r: Route) => void;
}

const NavContext = createContext<Ctx | null>(null);
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabId>('workout');
  const [stack, setStack] = useState<StackItem[]>([]);
  const depth = useRef(0);
  depth.current = stack.length;

  const push = useCallback((r: Route) => {
    setStack((s) => [...s, { ...r, key: uid() }]);
    // Tarayıcı geçmişine yazınca iPhone'daki kenardan geri kaydırma hareketi de çalışır.
    if (isWeb) window.history.pushState({ spor: true }, '');
  }, []);

  const pop = useCallback(() => {
    if (isWeb) window.history.back();
    else setStack((s) => s.slice(0, -1));
  }, []);

  const replace = useCallback((r: Route) => {
    setStack((s) => [...s.slice(0, -1), { ...r, key: uid() }]);
  }, []);

  useEffect(() => {
    if (isWeb) {
      const h = () => setStack((s) => s.slice(0, -1));
      window.addEventListener('popstate', h);
      return () => window.removeEventListener('popstate', h);
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (depth.current === 0) return false;
      setStack((s) => s.slice(0, -1));
      return true;
    });
    return () => sub.remove();
  }, []);

  const value = useMemo(() => ({ tab, setTab, stack, push, pop, replace }), [tab, stack, push, pop, replace]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): Ctx {
  const c = useContext(NavContext);
  if (!c) throw new Error('NavProvider eksik');
  return c;
}
