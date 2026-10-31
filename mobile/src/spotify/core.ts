export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export interface CryptoTools { random(): string; challenge(value: string): Promise<string>; }
interface Tokens { access_token: string; refresh_token: string; expiresAt: number; }
interface Pending { state: string; verifier: string; clientId: string; redirectUri: string; createdAt: number; }
const scopes = ['streaming', 'user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative', 'user-read-playback-state', 'user-modify-playback-state'];
const tokenEndpoint = 'https://accounts.spotify.com/api/token';
export async function pkceChallenge(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export class SpotifyError extends Error {
  status: number;
  retryAfter: number;
  constructor(message: string, status = 0, retryAfter = 0) { super(message); this.name = 'SpotifyError'; this.status = status; this.retryAfter = retryAfter; }
}
const reconnect = () => new SpotifyError('Phiên đã hết hạn. Hãy đăng nhập Spotify lại.', 401);
export class SpotifyClient {
  private store: Store;
  private crypt: CryptoTools;
  private fetcher: typeof fetch;
  private refreshing: Promise<string> | null = null;
  private generation = 0;
  private exchanging = false;
  private cooldownUntil = 0;
  constructor(store: Store, crypt: CryptoTools, fetcher: typeof fetch = fetch) { this.store = store; this.crypt = crypt; this.fetcher = (input, init) => fetcher(input, init); }
  async hasSession() { return Boolean(await this.store.get('tokens')); }
  async clientId() { return (await this.store.get('clientId')) ?? ''; }
  async loginUrl(clientId: string, redirectUri: string): Promise<string> {
    if (!/^[a-f0-9]{32}$/i.test(clientId.trim())) throw new SpotifyError('Client ID phải gồm 32 ký tự, lấy từ Spotify Developer Dashboard.');
    await this.logout();
    const verifier = this.crypt.random() + this.crypt.random();
    const state = this.crypt.random();
    const challenge = await this.crypt.challenge(verifier);
    const pending: Pending = { state, verifier, clientId: clientId.trim(), redirectUri, createdAt: Date.now() };
    await this.store.set('pending', JSON.stringify(pending));
    await this.store.set('clientId', clientId.trim());
    return 'https://accounts.spotify.com/authorize?' + new URLSearchParams({ client_id: clientId.trim(), response_type: 'code', redirect_uri: redirectUri, scope: scopes.join(' '), state, code_challenge_method: 'S256', code_challenge: challenge });
  }
  async acceptCallback(params: URLSearchParams, redirectUri: string): Promise<void> {
    if (this.exchanging) throw new SpotifyError('Phiên đăng nhập này đang được xử lý.');
    this.exchanging = true;
    try { await this.completeCallback(params, redirectUri); }
    finally { this.exchanging = false; }
  }
  private async completeCallback(params: URLSearchParams, redirectUri: string): Promise<void> {
    const raw = await this.store.get('pending');
    const pending: Pending | null = raw ? JSON.parse(raw) : null;
    if (!pending || !params.get('state') || pending.state !== params.get('state') || pending.redirectUri !== redirectUri || Date.now() - pending.createdAt > 600000) {
      throw new SpotifyError('Không xác minh được phiên đăng nhập. Vui lòng kết nối Spotify lại.');
    }
    // Consume before any network activity: a callback can only be used once.
    await this.store.remove('pending');
    if (params.has('error')) throw new SpotifyError('Bạn chưa cho phép kết nối Spotify. Có thể thử đăng nhập lại.');
    const code = params.get('code');
    if (!code) throw new SpotifyError('Spotify không trả về mã đăng nhập. Vui lòng thử lại.');
    const generation = this.generation;
    const response = await this.fetcher(tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: pending.clientId, code_verifier: pending.verifier }).toString() });
    if (!response.ok) throw new SpotifyError('Không đổi được mã đăng nhập. Kiểm tra Client ID và Redirect URI rồi kết nối lại.', response.status);
    await this.saveTokens(await response.json(), undefined, generation);
  }
  private async saveTokens(data: Record<string, unknown>, previous: Tokens | undefined, generation: number): Promise<string> {
    if (generation !== this.generation) throw reconnect();
    if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in) || Number(data.expires_in) <= 0 || (typeof data.refresh_token !== 'string' && !previous?.refresh_token)) throw new SpotifyError('Spotify trả về phiên không hợp lệ. Hãy đăng nhập lại.', 401);
    const tokens: Tokens = { access_token: data.access_token, refresh_token: typeof data.refresh_token === 'string' ? data.refresh_token : previous!.refresh_token, expiresAt: Date.now() + Number(data.expires_in) * 1000 };
    await this.store.set('tokens', JSON.stringify(tokens));
    // Native secure storage is asynchronous; logout can happen while persisting.
    if (generation !== this.generation) { await this.store.remove('tokens'); throw reconnect(); }
    return tokens.access_token;
  }
  async token(force = false): Promise<string> {
    const raw = await this.store.get('tokens');
    if (!raw) throw reconnect();
    const tokens: Tokens = JSON.parse(raw);
    if (!force && tokens.expiresAt > Date.now() + 60000) return tokens.access_token;
    if (this.refreshing) return this.refreshing;
    const generation = this.generation;
    const promise = (async () => {
      const clientId = await this.clientId();
      if (!clientId || !tokens.refresh_token) throw reconnect();
      const response = await this.fetcher(tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId }).toString() });
      if (!response.ok) {
        if (response.status === 400 || response.status === 401) { if (generation === this.generation) await this.logout(); throw reconnect(); }
        throw new SpotifyError('Không làm mới được phiên Spotify. Hãy kiểm tra mạng rồi thử lại.', response.status);
      }
      return this.saveTokens(await response.json(), tokens, generation);
    })();
    this.refreshing = promise;
    try { return await promise; } finally { if (this.refreshing === promise) this.refreshing = null; }
  }
  async logout(): Promise<void> {
    this.generation++; this.refreshing = null; this.cooldownUntil = 0;
    await Promise.all([this.store.remove('tokens'), this.store.remove('pending')]);
  }
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new SpotifyError('Không chấp nhận đường dẫn API bên ngoài Spotify.');
    const remaining = Math.ceil((this.cooldownUntil - Date.now()) / 1000);
    if (remaining > 0) throw new SpotifyError(`Spotify đang giới hạn yêu cầu. Hãy thử lại sau ${remaining} giây.`, 429, remaining);
    const generation = this.generation;
    const send = (token: string) => this.fetcher('https://api.spotify.com/v1' + path, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } });
    let token = await this.token();
    let response = await send(token);
    if (generation !== this.generation) throw reconnect();
    if (response.status === 401) {
      const current = await this.token();
      token = current === token ? await this.token(true) : current;
      response = await send(token);
    }
    if (generation !== this.generation) throw reconnect();
    if (response.status === 429) {
      const header = response.headers.get('Retry-After') ?? '30';
      const seconds = Number(header);
      const wait = Number.isFinite(seconds) ? Math.max(1, seconds) : Math.max(1, (Date.parse(header) - Date.now()) / 1000 || 30);
      this.cooldownUntil = Date.now() + wait * 1000;
      throw new SpotifyError(`Spotify đang giới hạn yêu cầu. Hãy thử lại sau ${Math.ceil(wait)} giây.`, 429, wait);
    }
    if (response.status === 401) { await this.logout(); throw reconnect(); }
    if (!response.ok) {
      const messages: Record<number, string> = { 403: 'Spotify từ chối quyền truy cập. Kiểm tra Premium, danh sách người dùng được phép và quyền API. Nội dung playlist chỉ khả dụng khi bạn sở hữu hoặc cộng tác.', 404: 'Không tìm thấy nội dung hoặc thiết bị. Mở Spotify và chọn một thiết bị đang hoạt động.' };
      throw new SpotifyError(messages[response.status] ?? `Spotify trả về lỗi ${response.status}. Vui lòng thử lại.`, response.status);
    }
    return response.status === 204 ? null as T : response.json();
  }
}
