import type { Env } from './env.js';

export interface Session {
  githubId: string;
  login: string;
}

export async function getSession(request: Request, env: Env): Promise<Session | null> {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) return null;

  const token = match[1];
  try {
    const payload = await verifyToken(token, env.SESSION_SECRET);
    return payload as Session;
  } catch {
    return null;
  }
}

export async function createSessionCookie(
  session: Session,
  secret: string
): Promise<string> {
  const token = await signToken(session, secret);
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const data = `${header}.${body}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '');
  return `${data}.${sigStr}`;
}

async function verifyToken(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const data = `${parts[0]}.${parts[1]}`;
  const key = await importKey(secret);
  const sig = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
  if (!valid) throw new Error('Invalid signature');
  return JSON.parse(atob(parts[1]));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}
