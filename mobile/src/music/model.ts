import type {
  Track,
  Library,
  SearchFilter,
  RepeatMode,
  ImportedTrack,
} from "./types";
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function searchLibrary(
  tracks: Track[],
  query: string,
  filter: SearchFilter = "all",
): Track[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(" ");
  return tracks
    .map((track, index) => {
      const title = normalize(track.title),
        artist = normalize(track.artist),
        collection = normalize(track.collection);
      const fields =
        filter === "artists"
          ? artist
          : filter === "collections"
            ? collection
            : `${title} ${artist} ${collection} ${normalize(track.genre)}`;
      if (!tokens.every((token) => fields.includes(token))) return null;
      const score =
        title === q
          ? 100
          : title.startsWith(q)
            ? 80
            : title.includes(q)
              ? 60
              : artist === q
                ? 50
                : artist.includes(q)
                  ? 40
                  : 20;
      return { track, index, score };
    })
    .filter(
      (entry): entry is { track: Track; index: number; score: number } =>
        entry !== null,
    )
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.track);
}
export const rememberSearch = (history: string[], query: string) =>
  normalize(query)
    ? [
        query.trim().slice(0, 160),
        ...history.filter((item) => normalize(item) !== normalize(query)),
      ].slice(0, 10)
    : history;
export const removeRecent = (history: string[], query: string) =>
  history.filter((item) => normalize(item) !== normalize(query));
export const initialLibrary = (): Library => ({
  favorites: [],
  playlists: [],
  recentSearches: [],
  recentlyPlayed: [],
  imports: [],
  volume: 0.8,
});
const strings = (value: unknown, limit = 5000): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (x): x is string =>
              typeof x === "string" && x.length > 0 && x.length < 200,
          ),
        ),
      ].slice(0, limit)
    : [];
export function readLibrary(raw: string | null): Library {
  if (!raw) return initialLibrary();
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data))
      return initialLibrary();
    const playlists = Array.isArray(data.playlists)
      ? data.playlists
          .filter(
            (p: unknown): p is Record<string, unknown> =>
              Boolean(p) &&
              typeof p === "object" &&
              typeof (p as any).id === "string" &&
              typeof (p as any).name === "string",
          )
          .slice(0, 100)
          .map((p: Record<string, unknown>) => ({
            id: String(p.id).slice(0, 160),
            name: String(p.name).slice(0, 100),
            trackIds: strings(p.trackIds),
          }))
      : [];
    const imports: ImportedTrack[] = Array.isArray(data.imports)
      ? data.imports
          .filter(
            (t: any) =>
              t &&
              typeof t.id === "string" &&
              /^import-[\w-]+$/.test(t.id) &&
              [
                "title",
                "artist",
                "collection",
                "genre",
                "color",
                "fileName",
              ].every(
                (key) => typeof t[key] === "string" && t[key].length < 500,
              ),
          )
          .slice(0, 500)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            collection: t.collection,
            genre: t.genre,
            color: t.color,
            fileName: t.fileName,
          }))
      : [];
    return {
      favorites: strings(data.favorites),
      playlists,
      recentSearches: strings(data.recentSearches, 10),
      recentlyPlayed: strings(data.recentlyPlayed, 30),
      imports,
      volume:
        typeof data.volume === "number" && Number.isFinite(data.volume)
          ? Math.max(0, Math.min(1, data.volume))
          : 0.8,
    };
  } catch {
    return initialLibrary();
  }
}
export const toggleFavorite = (state: Library, id: string): Library => ({
  ...state,
  favorites: state.favorites.includes(id)
    ? state.favorites.filter((x) => x !== id)
    : [...state.favorites, id],
});
export function createPlaylist(
  state: Library,
  name: string,
  id: string,
): Library {
  if (!name.trim()) throw new Error("Nhập tên playlist trước khi tạo.");
  if (state.playlists.length >= 100)
    throw new Error(
      "Thư viện đã có 100 playlist. Xóa một playlist để tạo thêm.",
    );
  return {
    ...state,
    playlists: [
      ...state.playlists,
      { id, name: name.trim().slice(0, 100), trackIds: [] },
    ],
  };
}
export const addToPlaylist = (
  state: Library,
  id: string,
  trackId: string,
): Library => ({
  ...state,
  playlists: state.playlists.map((p) =>
    p.id === id
      ? { ...p, trackIds: [...new Set([...p.trackIds, trackId])] }
      : p,
  ),
});
export const removeFromPlaylist = (
  state: Library,
  id: string,
  trackId: string,
): Library => ({
  ...state,
  playlists: state.playlists.map((p) =>
    p.id === id
      ? { ...p, trackIds: p.trackIds.filter((x) => x !== trackId) }
      : p,
  ),
});
export function advanceQueue(
  ids: string[],
  id: string,
  options: {
    direction?: 1 | -1;
    repeat?: RepeatMode;
    shuffle?: boolean;
    ended?: boolean;
    random?: () => number;
  },
): string | null {
  if (!ids.length) return null;
  if (options.ended && options.repeat === "one") return id;
  if (options.shuffle) {
    const candidates = ids.filter((x) => x !== id);
    if (!candidates.length) return options.repeat === "all" ? ids[0] : null;
    const r = (options.random ?? Math.random)();
    return candidates[
      Math.max(
        0,
        Math.min(
          candidates.length - 1,
          Math.floor((Number.isFinite(r) ? r : 0) * candidates.length),
        ),
      )
    ];
  }
  const index = ids.indexOf(id);
  if (index < 0) return ids[0];
  const next = index + (options.direction ?? 1);
  return next >= 0 && next < ids.length
    ? ids[next]
    : options.repeat === "all"
      ? ids[(next + ids.length) % ids.length]
      : null;
}
export const formatTime = (seconds = 0) =>
  `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, "0")}`;
