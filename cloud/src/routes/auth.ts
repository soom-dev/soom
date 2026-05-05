import type { Env } from '../env.js';
import { createSessionCookie, getSession } from '../session.js';

export async function handleAuthGithub(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/auth/github/callback`;
  const state = crypto.randomUUID();

  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubUrl.searchParams.set('redirect_uri', redirectUri);
  githubUrl.searchParams.set('scope', 'read:user');
  githubUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: githubUrl.toString(),
      'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

export async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }

  const cookie = request.headers.get('Cookie') ?? '';
  const storedState = cookie.match(/(?:^|;\s*)oauth_state=([^;]+)/)?.[1];
  if (state !== storedState) {
    return new Response('State mismatch', { status: 403 });
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return new Response(`OAuth failed: ${tokenData.error ?? 'unknown'}`, { status: 400 });
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'hansoom-cloud/1.0',
      Accept: 'application/vnd.github+json',
    },
  });

  const user = (await userResponse.json()) as { id: number; login: string };
  if (!user.id || !user.login) {
    return new Response('Failed to fetch user profile', { status: 500 });
  }

  const sessionCookie = await createSessionCookie(
    { githubId: String(user.id), login: user.login },
    env.SESSION_SECRET
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}/play`,
      'Set-Cookie': sessionCookie,
    },
  });
}

export async function handleAuthMe(request: Request, env: Env): Promise<Response> {
  const session = await getSession(request, env);
  if (!session) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ authenticated: true, login: session.login }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
