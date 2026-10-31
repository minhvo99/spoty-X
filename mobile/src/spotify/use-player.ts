import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { client } from './client';
import { isWeb } from './auth';
import { createPlayback } from './playback';
import type { PlaybackSession } from './playback';
import type { Device, Playback, Track } from './types';

export function usePlayer(connected: boolean, reportError: (error: string) => void) {
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [webDeviceId, setWebDeviceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const session = useRef<PlaybackSession | null>(null);
  const actionLock = useRef(false);
  const mounted = useRef(true);
  const connectedRef = useRef(connected); connectedRef.current = connected;
  const report = useRef(reportError); report.current = reportError;
  const lastError = useRef('');
  const refresh = useCallback(async () => {
    if (!connectedRef.current || AppState.currentState === 'background') return;
    try {
      const state = await client.request<Playback | null>('/me/player');
      if (mounted.current && connectedRef.current) { setPlayback(state); lastError.current = ''; }
    } catch (e) {
      if (!mounted.current || !connectedRef.current) return;
      const message = (e as Error).message;
      if (message !== lastError.current) { report.current(message); lastError.current = message; }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    setPlayback(null); setDevices([]); setDeviceId(null); setWebDeviceId(null); lastError.current = '';
    if (!connected) return;
    let active = true;
    const player = createPlayback(id => { if (active) setWebDeviceId(id); }, () => { if (active) void refresh(); }, message => { if (active) report.current(message); });
    session.current = player;
    void player.connect().catch(error => { if (active) report.current(error.message); });
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 8000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); player.disconnect(); session.current = null; };
  }, [connected, refresh, revision]);
  const refreshDevices = useCallback(async () => {
    const response = await client.request<{ devices: Device[] }>('/me/player/devices');
    if (mounted.current && connectedRef.current) setDevices(response.devices.filter(d => d.id && !d.is_restricted));
  }, []);
  const command = useCallback(async (path: string, method = 'PUT', body?: unknown) => {
    if (actionLock.current || !connectedRef.current) return;
    actionLock.current = true; setBusy(true);
    // Start browser audio activation synchronously within the user's gesture.
    const activation = isWeb ? session.current?.activate() : undefined;
    try {
      await activation;
      let target = deviceId ?? (isWeb ? webDeviceId : null) ?? playback?.device?.id;
      if (!target) {
        const result = await client.request<{ devices: Device[] }>('/me/player/devices');
        target = result.devices.find(d => d.is_active && !d.is_restricted)?.id;
      }
      if (!target) throw new Error(isWeb ? 'Trình phát web chưa sẵn sàng. Đợi kết nối hoặc mở Spotify và chọn thiết bị.' : 'Mở ứng dụng Spotify, phát một bài rồi quay lại chọn thiết bị.');
      // Respect a selected remote device; only transfer if it is not already active.
      if (playback?.device?.id !== target) await client.request('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [target], play: false }) });
      await client.request(path + (path.includes('?') ? '&' : '?') + 'device_id=' + encodeURIComponent(target), { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      await refresh();
    } catch (e) { if (mounted.current && connectedRef.current) report.current((e as Error).message); }
    finally { actionLock.current = false; if (mounted.current) setBusy(false); }
  }, [deviceId, webDeviceId, playback?.device?.id, refresh]);
  const play = (track: Track, contextUri?: string) => command('/me/player/play', 'PUT', contextUri ? { context_uri: contextUri, offset: { uri: track.uri } } : { uris: [track.uri] });
  return { playback, busy, play, command, devices, deviceId, webDeviceId, setDeviceId, refreshDevices, refresh, reconnect: () => setRevision(n => n + 1) };
}
