import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { produce } from 'immer';
import { DB, Exercise } from './types';
import { LIBRARY } from './data/exercises';

const KEY = 'spor-db-v1';

export function emptyDB(): DB {
  return {
    version: 1,
    customExercises: [],
    days: [],
    workouts: [],
    active: null,
    weights: [],
    measures: [],
    cardio: [],
    exerciseNotes: {},
    settings: {
      increment: 2.5,
      lastBackupAt: null,
      restEnabled: true,
      restSeconds: 120,
      restSound: true,
      trackRir: true,
      weeklyGoal: 4,
      goalWeight: null,
      barWeight: 20,
      plates: [25, 20, 15, 10, 5, 2.5, 1.25],
      muscleTargets: {},
    },
  };
}

/** Eksik alanları varsayılanlarla tamamlar. Geçersiz veride null döner. */
export function normalizeDB(raw: unknown): DB | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<DB>;
  const base = emptyDB();
  const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
  return {
    version: 1,
    customExercises: arr(r.customExercises, base.customExercises),
    days: arr(r.days, base.days),
    workouts: arr(r.workouts, base.workouts),
    active: r.active && typeof r.active === 'object' ? r.active : null,
    weights: arr(r.weights, base.weights),
    measures: arr(r.measures, base.measures),
    cardio: arr(r.cardio, base.cardio),
    exerciseNotes: r.exerciseNotes && typeof r.exerciseNotes === 'object' ? r.exerciseNotes : {},
    settings: { ...base.settings, ...(r.settings ?? {}) },
  };
}

interface Ctx {
  db: DB;
  ready: boolean;
  update: (fn: (draft: DB) => void) => void;
  replaceAll: (db: DB) => void;
}

const DBContext = createContext<Ctx | null>(null);

export function DBProvider({ children }: { children: React.ReactNode }) {
  const [db, setDB] = useState<DB>(emptyDB);
  const [ready, setReady] = useState(false);
  const latest = useRef(db);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current) return;
    dirty.current = false;
    AsyncStorage.setItem(KEY, JSON.stringify(latest.current)).catch(() => {
      dirty.current = true;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((text) => {
        if (!alive) return;
        if (text) {
          try {
            const parsed = normalizeDB(JSON.parse(text));
            if (parsed) {
              latest.current = parsed;
              setDB(parsed);
            }
          } catch {
            // bozuk kayıt: boş veriyle devam
          }
        }
      })
      .finally(() => alive && setReady(true));
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      // Tarayıcının veriyi kendiliğinden silmesini engellemeyi iste.
      (navigator as any).storage?.persist?.().catch?.(() => {});
    }
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flush();
    });
    let off = () => {};
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const h = () => flush();
      window.addEventListener('pagehide', h);
      window.addEventListener('beforeunload', h);
      off = () => {
        window.removeEventListener('pagehide', h);
        window.removeEventListener('beforeunload', h);
      };
    }
    return () => {
      sub.remove();
      off();
    };
  }, [flush]);

  const commit = useCallback(
    (next: DB) => {
      latest.current = next;
      dirty.current = true;
      setDB(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 250);
    },
    [flush],
  );

  const update = useCallback(
    (fn: (draft: DB) => void) => {
      commit(produce(latest.current, fn));
    },
    [commit],
  );

  const replaceAll = useCallback(
    (next: DB) => {
      commit(next);
      flush();
    },
    [commit, flush],
  );

  const value = useMemo(() => ({ db, ready, update, replaceAll }), [db, ready, update, replaceAll]);
  return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}

export function useDB(): Ctx {
  const c = useContext(DBContext);
  if (!c) throw new Error('DBProvider eksik');
  return c;
}

export function useExercises(): { list: Exercise[]; map: Map<string, Exercise> } {
  const { db } = useDB();
  return useMemo(() => {
    const list = [...LIBRARY, ...db.customExercises].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    return { list, map: new Map(list.map((e) => [e.id, e])) };
  }, [db.customExercises]);
}
