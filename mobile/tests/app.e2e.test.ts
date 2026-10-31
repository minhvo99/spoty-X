import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

let browser: Browser;
let base: string;
const dist = resolve('dist');
const server = createServer(async (req, res) => {
  const url = new URL(req.url!, 'http://127.0.0.1');
  if (!url.pathname.startsWith('/spoty-X/')) { res.writeHead(404).end(); return; }
  const path = resolve(dist, '.' + decodeURIComponent(url.pathname.slice('/spoty-X'.length) || '/index.html'));
  const file = url.pathname.endsWith('/') ? resolve(path, 'index.html') : path;
  if (!file.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
  try { const content = await readFile(file); res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' } as Record<string, string>)[extname(file)] ?? 'application/octet-stream'); res.end(content); }
  catch { res.writeHead(404).end(); }
});
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); base = `http://127.0.0.1:${typeof address === 'object' ? address!.port : 0}/spoty-X/`;
  browser = await chromium.launch({ headless: true });
  await mkdir('test-results', { recursive: true });
}, 30000);
afterAll(async () => { await browser?.close(); await new Promise<void>(resolve => server.close(() => resolve())); });
const track = { id: 'test-track', uri: 'spotify:track:test-track', type: 'track', name: 'Bài hát thử nghiệm', duration_ms: 180000, artists: [{ name: 'Nghệ sĩ thử nghiệm' }], album: { name: 'Album thử nghiệm', images: [] } };
const playlist = (id = 'test-playlist') => ({ id, uri: `spotify:playlist:${id}`, name: id === 'test-playlist' ? 'Playlist của tôi' : 'Playlist thứ hai', images: [], owner: { display_name: 'Test listener' }, items: { total: 1 } });
async function connectedPage() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(5000);
  page.on('pageerror', e => console.error('Fixture page error:', e.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('spotyx.clientId', '0'.repeat(32));
    sessionStorage.setItem('spotyx.tokens', JSON.stringify({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', expiresAt: Date.now() + 3600000 }));
  });
  await page.route('https://sdk.scdn.co/spotify-player.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.Spotify = { Player: class { listeners = {}; addListener(event, callback) { this.listeners[event] = callback; return true; } async connect() { this.listeners.ready?.({device_id:'fixture-web'}); return true; } async activateElement() {} disconnect() {} } }; window.onSpotifyWebPlaybackSDKReady?.();` }));
  let state: unknown = null;
  const mutations: { url: string; body: unknown }[] = [];
  await page.route('https://api.spotify.com/v1/**', async route => {
    const url = new URL(route.request().url()); const path = url.pathname; const method = route.request().method();
    if (method !== 'GET') {
      mutations.push({ url: route.request().url(), body: route.request().postDataJSON() });
      if (path.endsWith('/play')) state = { item: track, is_playing: true, progress_ms: 5000, shuffle_state: false, repeat_state: 'off', device: { id: 'fixture-web', name: 'Spoty-X Web', type: 'Computer', is_active: true } };
      await route.fulfill({ status: 204 }); return;
    }
    if (path === '/v1/me') { await route.fulfill({ json: { id: 'fixture', display_name: 'Test listener' } }); return; }
    if (path === '/v1/me/player') { await route.fulfill(state ? { json: state } : { status: 204 }); return; }
    if (path.endsWith('/devices')) { await route.fulfill({ json: { devices: [{ id: 'fixture-web', name: 'Spoty-X Web', is_active: true, type: 'Computer' }] } }); return; }
    if (path === '/v1/me/playlists') { await route.fulfill({ json: { items: [playlist(url.searchParams.has('offset') ? 'second' : undefined)], total: 2, next: url.searchParams.has('offset') ? null : 'https://api.spotify.com/v1/me/playlists?offset=1' } }); return; }
    if (path.includes('/playlists/')) { await route.fulfill({ json: { items: [{ item: track }], next: null, total: 1 } }); return; }
    if (path === '/v1/search') { await route.fulfill({ json: { tracks: { items: [track], next: null, total: 1 } } }); return; }
    await route.fulfill({ status: 404 });
  });
  return { page, mutations };
}

describe('Published React Native Web app', () => {
  test('mobile onboarding fits viewport and validates Client ID without sending secrets', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('heading', { name: /Nhạc của bạn/ }).waitFor();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/phone-home.png', fullPage: true });
    await page.getByRole('button', { name: 'Kết nối Spotify', exact: true }).click();
    await page.getByRole('textbox', { name: 'Spotify Client ID công khai' }).fill('not-a-secret');
    await page.getByRole('button', { name: 'Đăng nhập Spotify', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: /32 ký tự/ }).waitFor();
    expect(page.url()).toBe(base); expect(errors).toEqual([]);
    await page.screenshot({ path: 'test-results/phone-setup.png', fullPage: true });
    await page.close();
  });
  test('desktop renders at Pages subpath with no asset errors', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const bad: string[] = []; page.on('response', response => { if (response.status() >= 400) bad.push(response.url()); });
    await page.goto(base); await page.getByRole('heading', { name: /Nhạc của bạn/ }).waitFor();
    await page.screenshot({ path: 'test-results/desktop-home.png', fullPage: true });
    expect(bad).toEqual([]); expect(await page.title()).toBe('Spoty-X'); await page.close();
  });
  test('library pagination, 2026 playlist fields and real play command on phone', async () => {
    const { page, mutations } = await connectedPage();
    await page.goto(base); await page.getByRole('button', { name: 'Mở playlist Playlist của tôi' }).waitFor();
    await page.getByRole('button', { name: 'Tải thêm', exact: true }).click();
    await page.getByRole('button', { name: 'Mở playlist Playlist thứ hai' }).waitFor();
    await page.getByRole('button', { name: 'Mở playlist Playlist của tôi' }).click();
    await page.getByRole('button', { name: /Phát Bài hát thử nghiệm/ }).click();
    await page.getByRole('button', { name: 'Tạm dừng', exact: true }).waitFor();
    expect(mutations.some(m => m.url.includes('/play?device_id=fixture-web') && JSON.stringify(m.body).includes(track.uri) && JSON.stringify(m.body).includes('spotify:playlist:test-playlist'))).toBe(true);
    await page.screenshot({ path: 'test-results/phone-player.png', fullPage: true });
    await page.getByRole('button', { name: 'Tài khoản', exact: true }).click();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.getByRole('heading', { name: /Nhạc của bạn/ }).waitFor();
    expect(await page.evaluate(() => sessionStorage.getItem('spotyx.tokens'))).toBe(null); await page.close();
  });
  test('search 403 shows recovery and retries successfully', async () => {
    const { page } = await connectedPage(); let failed = true;
    await page.route('https://api.spotify.com/v1/search**', async route => {
      await route.fulfill(failed ? { status: 403, json: { error: 'forbidden' } } : { json: { tracks: { items: [track], total: 1, next: null } } });
    });
    await page.goto(base); await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await page.getByRole('textbox', { name: 'Tìm bài hát trên Spotify' }).fill('test');
    await page.getByRole('heading', { name: 'Chưa tải được kết quả' }).waitFor();
    failed = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.getByRole('button', { name: /Phát Bài hát thử nghiệm/ }).waitFor(); await page.close();
  });
  test('late search response never replaces the current query', async () => {
    const { page } = await connectedPage(); let release!: () => void; let started!: () => void;
    const waiting = new Promise<void>(resolve => { started = resolve; });
    await page.route('https://api.spotify.com/v1/search**', async route => {
      const old = new URL(route.request().url()).searchParams.get('q') === 'old';
      if (old) { started(); await new Promise<void>(resolve => { release = resolve; }); }
      await route.fulfill({ json: { tracks: { items: [{ ...track, name: old ? 'Old result' : 'New result' }], next: null, total: 1 } } }).catch(() => {});
    });
    await page.goto(base); await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await page.getByRole('textbox', { name: 'Tìm bài hát trên Spotify' }).fill('old'); await waiting;
    await page.getByRole('textbox', { name: 'Tìm bài hát trên Spotify' }).fill('new');
    await page.getByRole('button', { name: /Phát New result/ }).waitFor(); release();
    await page.waitForTimeout(100); expect(await page.getByRole('button', { name: /Phát Old result/ }).count()).toBe(0); await page.close();
  });
  test('invalid OAuth callback is rejected and removed from browser address', async () => {
    const page = await browser.newPage(); let exchanges = 0;
    await page.route('https://accounts.spotify.com/api/token', route => { exchanges++; return route.abort(); });
    await page.goto(base + '?code=fixture-code&state=wrong');
    await page.getByRole('alert').filter({ hasText: /phiên đăng nhập/ }).waitFor();
    expect(new URL(page.url()).search).toBe(''); expect(exchanges).toBe(0); await page.close();
  });
});
