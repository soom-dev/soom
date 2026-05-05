import { describe, expect, test, beforeEach } from 'bun:test';
import { checkRateLimit } from '../../cloud/src/rate-limit.js';

function createMockDb() {
  const rows: { key: string; window: string; ts: string }[] = [];

  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first<T>(): Promise<T | null> {
              if (sql.includes('SELECT COUNT')) {
                const [key, window, cutoff] = args as string[];
                const count = rows.filter(
                  (r) => r.key === key && r.window === window && r.ts > cutoff
                ).length;
                return { count } as T;
              }
              return null;
            },
            async run() {
              if (sql.includes('INSERT')) {
                const [key, window, ts] = args as string[];
                rows.push({ key, window, ts });
              }
              if (sql.includes('DELETE')) {
                const cutoff = args[0] as string;
                const before = rows.length;
                rows.length = 0;
                rows.push(...rows.filter((r) => r.ts >= cutoff));
                void before;
              }
            },
          };
        },
      };
    },
    _rows: rows,
  } as unknown as D1Database & { _rows: typeof rows };
}

describe('checkRateLimit', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  test('allows first request', async () => {
    const result = await checkRateLimit(db, 'anon:abc123', 'anon-render');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  test('tracks requests in db', async () => {
    await checkRateLimit(db, 'anon:abc123', 'anon-render');
    expect(db._rows.length).toBe(1);
    expect(db._rows[0].key).toBe('anon:abc123');
    expect(db._rows[0].window).toBe('anon-render');
  });

  test('allows unknown window types', async () => {
    const result = await checkRateLimit(db, 'test', 'unknown-window');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(999);
  });
});
