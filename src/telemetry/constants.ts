import { homedir } from 'node:os';
import { join } from 'node:path';

export const TELEMETRY_ENDPOINT = 'https://soom-telemetry.hansoom.workers.dev/v1/render';
export const PREFS_PATH = join(homedir(), '.soom', 'telemetry.json');
export const TELEMETRY_TIMEOUT_MS = 2000;
