const LIMITS: Record<string, { max: number; windowMinutes: number }> = {
  'anon-render': { max: 10, windowMinutes: 60 },
  'user-save': { max: 60, windowMinutes: 1440 },
};

export async function checkRateLimit(
  db: D1Database,
  key: string,
  window: string
): Promise<{ allowed: boolean; remaining: number }> {
  const config = LIMITS[window];
  if (!config) return { allowed: true, remaining: 999 };

  const cutoff = new Date(Date.now() - config.windowMinutes * 60_000).toISOString();

  const result = await db
    .prepare('SELECT COUNT(*) as count FROM rate_limits WHERE key = ? AND window = ? AND ts > ?')
    .bind(key, window, cutoff)
    .first<{ count: number }>();

  const count = result?.count ?? 0;
  const remaining = Math.max(0, config.max - count);

  if (count >= config.max) {
    return { allowed: false, remaining: 0 };
  }

  await db
    .prepare('INSERT INTO rate_limits (key, window, ts) VALUES (?, ?, ?)')
    .bind(key, window, new Date().toISOString())
    .run();

  return { allowed: true, remaining: remaining - 1 };
}

export async function cleanupExpiredRateLimits(db: D1Database): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  await db.prepare('DELETE FROM rate_limits WHERE ts < ?').bind(cutoff).run();
}
