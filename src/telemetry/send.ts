import { TELEMETRY_ENDPOINT, TELEMETRY_TIMEOUT_MS } from './constants.js';
import { readPrefs } from './prefs.js';
import type { TelemetryPayload } from './payload.js';

export async function sendTelemetry(payload: TelemetryPayload, prefsPath?: string): Promise<void> {
  const prefs = await readPrefs(prefsPath);
  if (!prefs?.enabled) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);

  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    // fire-and-forget: swallow all errors
  } finally {
    clearTimeout(timer);
  }
}
