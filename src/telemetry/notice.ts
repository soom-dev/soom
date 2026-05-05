import { PREFS_PATH } from './constants.js';
import { readPrefs, writePrefs } from './prefs.js';

const NOTICE = `
Hansoom collects anonymous usage data to help guide development.
We never collect file contents, paths, or anything that could identify you —
just diagram counts, render timing, version, and OS.

To opt out, run: soom telemetry disable
Learn more:     https://hansoom.dev/telemetry
`;

export async function showNoticeIfFirstRun(prefsPath = PREFS_PATH): Promise<void> {
  const prefs = await readPrefs(prefsPath);
  if (prefs !== null) return;

  process.stderr.write(NOTICE);
  await writePrefs({ enabled: true }, prefsPath);
}
