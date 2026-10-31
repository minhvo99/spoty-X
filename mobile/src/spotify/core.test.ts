import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SpotifyClient, pkceChallenge, SpotifyError } from './core.ts';
import type { Store } from './core.ts';

function setup(fetcher: typeof fetch = async () => Response.json({})) {
  const data = new Map<string, string>();
  const store: Store = { get: async k => data.get(k) ?? null, set: async (k, v) => { data.set(k, v); }, remove: async k => { data.delete(k); } };
  const client = new SpotifyClient(store, { random: () => crypto.randomUUID().replaceAll('-', ''), challenge: pkceChallenge }, fetcher);
  return { client, data };
}
const saved = (expiresAt = Date.now() + 3600000) => JSON.stringify({ access_token: 'old', refresh_token: 'refresh', expiresAt });

test('PKCE matches RFC 7636 S256 vector', async () => {
  assert.equal(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
test('rejects a mismatched OAuth state without exchanging code', async () => {
  let exchanges = 0;
  const { client } = setup(async () => { exchanges++; return Response.json({}); });
  await client.loginUrl('a'.repeat(32), 'https://example.com/');
  await assert.rejects(client.acceptCallback(new URLSearchParams('code=secret&state=wrong'), 'https://example.com/'), /phiên đăng nhập/);
  assert.equal(exchanges, 0);
});
test('successful callback consumes pending auth and rejects replay', async () => {
  const { client } = setup(async () => Response.json({ access_token: 'new', refresh_token: 'r', expires_in: 3600 }));
  const login = new URL(await client.loginUrl('a'.repeat(32), 'https://example.com/'));
  const params = new URLSearchParams({ code: 'code', state: login.searchParams.get('state')! });
  await client.acceptCallback(params, 'https://example.com/');
  assert.equal(await client.token(), 'new');
  await assert.rejects(client.acceptCallback(params, 'https://example.com/'), /phiên đăng nhập/);
});
test('rejects expired callback and changed redirect', async () => {
  const { client, data } = setup();
  const login = new URL(await client.loginUrl('a'.repeat(32), 'https://example.com/'));
  const params = new URLSearchParams({ code: 'code', state: login.searchParams.get('state')! });
  await assert.rejects(client.acceptCallback(params, 'https://other.com/'), /phiên đăng nhập/);
  const pending = JSON.parse(data.get('pending')!); pending.createdAt = 0; data.set('pending', JSON.stringify(pending));
  await assert.rejects(client.acceptCallback(params, 'https://example.com/'), /phiên đăng nhập/);
});
test('concurrent refresh preserves original refresh token when omitted', async () => {
  let refreshes = 0;
  const { client, data } = setup(async () => { refreshes++; await new Promise(r => setTimeout(r, 5)); return Response.json({ access_token: 'new', expires_in: 3600 }); });
  data.set('tokens', saved(0)); data.set('clientId', 'a'.repeat(32));
  assert.deepEqual(await Promise.all([client.token(), client.token(), client.token()]), ['new', 'new', 'new']);
  assert.equal(refreshes, 1);
  assert.equal(JSON.parse(data.get('tokens')!).refresh_token, 'refresh');
});
test('logout during refresh cannot resurrect session', async () => {
  let resolve!: (response: Response) => void;
  const { client, data } = setup(() => new Promise(r => { resolve = r; }));
  data.set('tokens', saved(0)); data.set('clientId', 'a'.repeat(32));
  const pending = client.token();
  await new Promise(r => setTimeout(r, 0));
  await client.logout(); resolve(Response.json({ access_token: 'new', expires_in: 3600 }));
  await assert.rejects(pending, /đăng nhập/);
  assert.equal(data.has('tokens'), false);
});
test('401 refreshes once then retries with fresh bearer', async () => {
  const seen: string[] = [];
  const { client, data } = setup(async (url, init) => {
    if (String(url).includes('/api/token')) return Response.json({ access_token: 'new', expires_in: 3600 });
    seen.push(new Headers(init?.headers).get('Authorization')!);
    return seen.length === 1 ? new Response('', { status: 401 }) : Response.json({ id: 'me' });
  });
  data.set('tokens', saved()); data.set('clientId', 'a'.repeat(32));
  assert.deepEqual(await client.request('/me'), { id: 'me' });
  assert.deepEqual(seen, ['Bearer old', 'Bearer new']);
});
test('429 prevents further API calls until Retry-After has elapsed', async () => {
  let calls = 0;
  const { client, data } = setup(async () => { calls++; return new Response('', { status: 429, headers: { 'Retry-After': '30' } }); });
  data.set('tokens', saved());
  await assert.rejects(client.request('/me'), (e: unknown) => e instanceof SpotifyError && e.status === 429 && e.retryAfter >= 29);
  await assert.rejects(client.request('/me'), /thử lại/);
  assert.equal(calls, 1);
});
test('empty 204 player response is null; external pagination URL is rejected', async () => {
  const { client, data } = setup(async () => new Response(null, { status: 204 })); data.set('tokens', saved());
  assert.equal(await client.request('/me/player'), null);
  await assert.rejects(client.request('https://evil.example/steal'), /đường dẫn/);
});
test('invalid grant clears expired session and prompts reconnect', async () => {
  const { client, data } = setup(async () => Response.json({ error: 'invalid_grant' }, { status: 400 }));
  data.set('tokens', saved(0)); data.set('clientId', 'a'.repeat(32));
  await assert.rejects(client.token(), /đăng nhập/); assert.equal(data.has('tokens'), false);
});
test('calls browser fetch without binding it to SpotifyClient', async () => {
  const { client, data } = setup(async function (this: unknown) {
    assert.equal(this, undefined, 'Browser fetch rejects a SpotifyClient receiver');
    return Response.json({ id: 'me' });
  });
  data.set('tokens', saved());
  assert.deepEqual(await client.request('/me'), { id: 'me' });
});
test('simultaneous copies of an OAuth callback exchange the code only once', async () => {
  let exchanges = 0;
  const { client } = setup(async () => { exchanges++; return Response.json({ access_token: 'new', refresh_token: 'r', expires_in: 3600 }); });
  const url = new URL(await client.loginUrl('a'.repeat(32), 'https://example.com/'));
  const params = new URLSearchParams({ code: 'code', state: url.searchParams.get('state')! });
  const results = await Promise.allSettled([client.acceptCallback(params, 'https://example.com/'), client.acceptCallback(params, 'https://example.com/')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(exchanges, 1);
});
