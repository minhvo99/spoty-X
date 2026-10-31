import { test, expect } from 'vitest';
import { tracksFromItems, nextPath, formatTime, isPlayable } from './data';
const track = { id: 'a', uri: 'spotify:track:a', name: 'A', type: 'track', duration_ms: 90000 };
test('accepts 2026 item and legacy track field and skips removed content', () => {
  expect(tracksFromItems([{ item: track }, { track }, { item: null }, { item: { ...track, type: 'episode' } }])).toEqual([track, track]);
});
test('pagination never sends credentials to a non Spotify URL', () => {
  expect(nextPath('https://api.spotify.com/v1/me/playlists?offset=20')).toBe('/me/playlists?offset=20');
  expect(() => nextPath('https://evil.example/v1/me')).toThrow();
});
test('does not offer playback for unavailable/local tracks', () => {
  expect(isPlayable(track)).toBe(true);
  expect(isPlayable({ ...track, is_playable: false })).toBe(false);
  expect(isPlayable({ ...track, is_local: true })).toBe(false);
});
test('progress formatting handles missing and negative durations', () => {
  expect(formatTime(90000)).toBe('1:30'); expect(formatTime(null)).toBe('0:00'); expect(formatTime(-1)).toBe('0:00');
});
