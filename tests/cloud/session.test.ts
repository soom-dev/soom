import { describe, expect, test } from 'bun:test';
import { createSessionCookie, getSession } from '../../cloud/src/session.js';

const SECRET = 'test-secret-key-for-unit-tests';

describe('session', () => {
  test('createSessionCookie returns a Set-Cookie string', async () => {
    const cookie = await createSessionCookie(
      { githubId: '12345', login: 'testuser' },
      SECRET
    );
    expect(cookie).toContain('session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
  });

  test('getSession round-trips through cookie', async () => {
    const cookie = await createSessionCookie(
      { githubId: '12345', login: 'testuser' },
      SECRET
    );
    const token = cookie.match(/session=([^;]+)/)?.[1];
    expect(token).toBeDefined();

    const request = new Request('https://example.com', {
      headers: { Cookie: `session=${token}` },
    });

    const session = await getSession(request, {
      SESSION_SECRET: SECRET,
    } as any);

    expect(session).not.toBeNull();
    expect(session!.githubId).toBe('12345');
    expect(session!.login).toBe('testuser');
  });

  test('getSession returns null for missing cookie', async () => {
    const request = new Request('https://example.com');
    const session = await getSession(request, {
      SESSION_SECRET: SECRET,
    } as any);
    expect(session).toBeNull();
  });

  test('getSession returns null for invalid token', async () => {
    const request = new Request('https://example.com', {
      headers: { Cookie: 'session=invalid.token.here' },
    });
    const session = await getSession(request, {
      SESSION_SECRET: SECRET,
    } as any);
    expect(session).toBeNull();
  });

  test('getSession rejects tampered token', async () => {
    const cookie = await createSessionCookie(
      { githubId: '12345', login: 'testuser' },
      SECRET
    );
    const token = cookie.match(/session=([^;]+)/)?.[1];
    const tampered = token!.slice(0, -5) + 'XXXXX';

    const request = new Request('https://example.com', {
      headers: { Cookie: `session=${tampered}` },
    });
    const session = await getSession(request, {
      SESSION_SECRET: SECRET,
    } as any);
    expect(session).toBeNull();
  });
});
