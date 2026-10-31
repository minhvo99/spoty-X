import type { PlaylistItem, Track } from './types';
export const tracksFromItems = (items: PlaylistItem[]): Track[] => items.flatMap(row => {
  const track = row.item ?? row.track;
  return track && track.type === 'track' ? [track] : [];
});
export function nextPath(next: string): string {
  const url = new URL(next);
  if (url.origin !== 'https://api.spotify.com' || !url.pathname.startsWith('/v1/')) throw new Error('Đường dẫn phân trang Spotify không hợp lệ.');
  return url.pathname.slice(3) + url.search;
}
export function formatTime(ms?: number | null): string {
  const seconds = Math.max(0, Math.floor((ms ?? 0) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export const isPlayable = (track: Track): boolean => track.type === 'track' && !track.is_local && track.is_playable !== false && track.uri?.startsWith('spotify:track:');
