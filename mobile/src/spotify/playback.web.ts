import { client } from './client';
export interface PlaybackSession { connect(): Promise<void>; activate(): Promise<void>; disconnect(): void; }
interface SDKPlayer {
  addListener(event: string, callback: (data: any) => void): boolean;
  connect(): Promise<boolean>;
  activateElement(): Promise<void>;
  disconnect(): void;
}
declare global {
  interface Window {
    Spotify?: { Player: new (options: { name: string; getOAuthToken: (callback: (token: string) => void) => void; volume: number }) => SDKPlayer };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}
let sdkPromise: Promise<void> | null = null;
function loadSDK(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (!sdkPromise) sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js'; script.async = true;
    const timer = setTimeout(() => { script.remove(); reject(new Error('Không tải được Spotify Player. Kiểm tra mạng và thử lại.')); }, 20000);
    window.onSpotifyWebPlaybackSDKReady = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Không tải được Spotify Player. Kiểm tra kết nối mạng.')); };
    document.head.appendChild(script);
  }).catch(error => { sdkPromise = null; throw error; });
  return sdkPromise;
}
export function createPlayback(onDevice: (id: string | null) => void, onChange: () => void, onError: (message: string) => void): PlaybackSession {
  let player: SDKPlayer | null = null;
  let disposed = false;
  return {
    async connect() {
      await loadSDK(); if (disposed) return;
      player = new window.Spotify!.Player({ name: 'Spoty-X Web', volume: 0.7, getOAuthToken: callback => { client.token().then(token => { if (!disposed) callback(token); }).catch(error => { if (!disposed) onError(error.message); }); } });
      player.addListener('ready', ({ device_id }: { device_id: string }) => { if (!disposed) onDevice(device_id); });
      player.addListener('not_ready', () => { if (!disposed) onDevice(null); });
      player.addListener('player_state_changed', () => { if (!disposed) onChange(); });
      const errors: Record<string, string> = {
        initialization_error: 'Trình duyệt không hỗ trợ Spotify Player. Thử Chrome/Safari mới nhất hoặc chọn thiết bị Spotify khác.',
        authentication_error: 'Spotify Player chưa xác thực được. Hãy đăng xuất và kết nối lại.',
        account_error: 'Phát nhạc Spotify trên web cần tài khoản Premium đang hoạt động.',
        playback_error: 'Spotify không phát được bài này. Thử bài khác hoặc kiểm tra thiết bị.',
        autoplay_failed: 'Trình duyệt đang chặn tự phát. Nhấn phát để bắt đầu nghe.',
      };
      for (const [event, message] of Object.entries(errors)) player.addListener(event, () => { if (!disposed) onError(message); });
      if (!await player.connect() && !disposed) throw new Error('Chưa kết nối được Spotify Player. Hãy thử kết nối lại.');
    },
    async activate() { if (player && !disposed) await player.activateElement(); },
    disconnect() { disposed = true; player?.disconnect(); player = null; },
  };
}
