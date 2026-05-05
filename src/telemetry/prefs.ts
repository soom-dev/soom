import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PREFS_PATH } from './constants.js';

export interface TelemetryPrefs {
  enabled: boolean;
}

export async function readPrefs(path = PREFS_PATH): Promise<TelemetryPrefs | null> {
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed?.enabled === 'boolean') return { enabled: parsed.enabled };
    return null;
  } catch {
    return null;
  }
}

export async function writePrefs(prefs: TelemetryPrefs, path = PREFS_PATH): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(prefs), 'utf-8');
}
