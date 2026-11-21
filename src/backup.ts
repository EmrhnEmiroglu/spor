import { Platform, Share } from 'react-native';
import { DB } from './types';
import { normalizeDB } from './store';
import { todayStr } from './logic';

export type ExportResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

export function backupText(db: DB): string {
  return JSON.stringify({ app: 'spor', exportedAt: new Date().toISOString(), db });
}

/** Yedeği dosya olarak verir: telefonda paylaşım menüsü, bilgisayarda indirme. */
export async function exportBackup(db: DB): Promise<ExportResult> {
  const json = backupText(db);
  const name = `spor-yedek-${todayStr()}.json`;
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message: json, title: name });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    const file = new File([json], name, { type: 'application/json' });
    const n = navigator as any;
    const touch = (n.maxTouchPoints ?? 0) > 0;
    if (touch && n.canShare?.({ files: [file] })) {
      try {
        await n.share({ files: [file], title: name });
        return 'shared';
      } catch (e: any) {
        if (e?.name === 'AbortError') return 'cancelled';
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

/** Web'de dosya seçtirir ve içeriğini metin olarak döner. */
export function pickBackupFile(): Promise<string | null> {
  if (Platform.OS !== 'web') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.style.display = 'none';
    input.onchange = () => {
      const f = input.files?.[0];
      input.remove();
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    document.body.appendChild(input);
    input.click();
  });
}

export function parseBackup(text: string): DB | null {
  try {
    const raw = JSON.parse(text);
    const candidate = raw && typeof raw === 'object' && 'db' in raw ? raw.db : raw;
    if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.workouts)) return null;
    return normalizeDB(candidate);
  } catch {
    return null;
  }
}
