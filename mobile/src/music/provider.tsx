import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import { catalog } from "./catalog";
import { createTransport } from "./transport";
import { canControlVolume } from "./capabilities";
import {
  addToPlaylist,
  advanceQueue,
  createPlaylist,
  initialLibrary,
  rememberSearch,
  removeFromPlaylist,
  removeRecent,
  toggleFavorite,
} from "./model";
import { createWriter, importMetadata } from "./persistence";
import * as storage from "./storage";
import type { Library, RepeatMode, Track } from "./types";

function useMusicState() {
  const [library, setLibrary] = useState(initialLibrary);
  const [imports, setImports] = useState<Track[]>([]);
  const [ready, setReady] = useState(false);
  const [writable, setWritable] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const transport = useMemo(
    () => createTransport(player, setError, canControlVolume()),
    [player],
  );
  const writer = useRef(createWriter(initialLibrary(), storage.writeState));
  const mounted = useRef(true);
  const urls = useRef(new Set<string>());
  const loadingImport = useRef(false);
  const trackRef = useRef<Track | null>(null);
  const stateRef = useRef({ queue, shuffle, repeat });
  useEffect(() => {
    stateRef.current = { queue, shuffle, repeat };
  }, [queue, shuffle, repeat]);
  const ended = useRef(false);
  const tracks = useMemo(() => [...catalog, ...imports], [imports]);
  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  const activeTrack = tracks.find((t) => t.id === activeId) ?? null;
  useEffect(() => {
    mounted.current = true;
    let active = true;
    const sources = urls.current;
    void (async () => {
      try {
        const saved = await storage.readState();
        if (!active) return;
        writer.current = createWriter(saved, storage.writeState);
        setLibrary(saved);
        setWritable(true);
        transport.setVolume(saved.volume);
        const recovered: Track[] = [];
        for (const track of saved.imports) {
          try {
            const source = await storage.loadAudio(track);
            if (source) {
              urls.current.add(source);
              recovered.push({ ...track, imported: true, source });
            } else if (active)
              setError(
                "Một số tệp nhạc không còn trong bộ nhớ. Metadata và playlist vẫn được giữ; nhập lại tệp để nghe.",
              );
          } catch {
            if (active)
              setError(
                "Không đọc được kho tệp nhạc. Playlist và metadata vẫn được giữ; tải lại trang để thử lại.",
              );
          }
        }
        if (!active) {
          for (const t of recovered) storage.releaseAudio(String(t.source));
          return;
        }
        setImports(recovered);
      } catch {
        if (active)
          setError(
            "Không đọc được metadata thư viện. Chế độ lưu thay đổi đã tắt để giữ dữ liệu cũ; bật quyền lưu trữ và tải lại trang.",
          );
      } finally {
        if (active) setReady(true);
      }
    })();
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(() => {
      if (active)
        setError(
          "Chưa bật được chế độ âm thanh nền. Bạn vẫn có thể thử phát trong ứng dụng.",
        );
    });
    return () => {
      active = false;
      mounted.current = false;
      for (const source of sources) storage.releaseAudio(source);
      sources.clear();
    };
  }, [player, transport]);
  const change = useCallback(
    async (update: (state: Library) => Library) => {
      if (!ready || !writable) {
        setError(
          "Chưa mở được thư viện đã lưu. Hãy tải lại trang trước khi lưu thay đổi.",
        );
        return false;
      }
      try {
        const next = await writer.current.change(update);
        if (mounted.current) setLibrary(next);
        return true;
      } catch {
        if (mounted.current)
          setError(
            "Không lưu được thay đổi trên thiết bị. Kiểm tra dung lượng hoặc quyền lưu trữ rồi thử lại.",
          );
        return false;
      }
    },
    [ready, writable],
  );
  const changeRef = useRef(change);
  useEffect(() => {
    changeRef.current = change;
  }, [change]);
  const play = useCallback(
    (track: Track, ids?: string[]) => {
      try {
        setError("");
        ended.current = false;
        const nextQueue = (
          ids?.length ? ids : tracksRef.current.map((t) => t.id)
        ).filter((id) => tracksRef.current.some((t) => t.id === id));
        if (!nextQueue.includes(track.id)) nextQueue.push(track.id);
        stateRef.current.queue = nextQueue;
        setQueue(nextQueue);
        trackRef.current = track;
        setActiveId(track.id);
        try {
          player.setActiveForLockScreen(true, {
            title: track.title,
            artist: track.artist,
            albumTitle: track.collection,
          });
        } catch {
          /* Optional OS controls must not block playback. */
        }
        transport.play(track);
        void changeRef.current((s) => ({
          ...s,
          recentlyPlayed: [
            track.id,
            ...s.recentlyPlayed.filter((id) => id !== track.id),
          ].slice(0, 30),
        }));
      } catch {
        setError(
          "Không phát được tệp này. Thử một bài khác hoặc nhập lại âm thanh với định dạng được thiết bị hỗ trợ.",
        );
      }
    },
    [player, transport],
  );
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);
  const next = useCallback(
    (direction: 1 | -1 = 1, natural = false) => {
      const current = trackRef.current;
      if (!current) return;
      const state = stateRef.current;
      if (direction === -1 && player.currentTime > 3) {
        void transport.seek(0).catch(() => setError("Không tua được bài hát."));
        return;
      }
      const available = state.queue.filter((id) =>
        tracksRef.current.some((t) => t.id === id),
      );
      const id = advanceQueue(available, current.id, {
        direction,
        shuffle: state.shuffle,
        repeat: state.repeat,
        ended: natural,
      });
      if (id === current.id) {
        ended.current = false;
        transport.restart();
        return;
      }
      const target = tracksRef.current.find((t) => t.id === id);
      if (target) playRef.current(target, available);
      else transport.pause();
    },
    [player, transport],
  );
  useEffect(() => {
    const listener = player.addListener("playbackStatusUpdate", (event) => {
      const message = (event as typeof event & { error?: string }).error;
      if (message || event.playbackState === "error")
        setError(
          "Không đọc được âm thanh. Thử bài khác hoặc nhập lại tệp nhạc.",
        );
      if (event.didJustFinish && !ended.current) {
        ended.current = true;
        next(1, true);
      }
    });
    return () => listener.remove();
  }, [player, next]);
  const importing = async () => {
    if (loadingImport.current || !ready) return;
    if (!writable) {
      setError("Tải lại thư viện trước khi nhập nhạc để giữ dữ liệu đã lưu.");
      return;
    }
    loadingImport.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      if (result.assets.length > 10)
        throw new Error("Mỗi lần nhập tối đa 10 tệp nhạc.");
      for (const asset of result.assets) {
        if (writer.current.current().imports.length >= 500)
          throw new Error(
            "Thư viện đã có 500 tệp. Gỡ bớt nhạc trước khi nhập thêm.",
          );
        const metadata = importMetadata(asset, Crypto.randomUUID());
        const source = await storage.saveAudio(asset, metadata);
        urls.current.add(source);
        if (await change((s) => ({ ...s, imports: [...s.imports, metadata] })))
          setImports((old) => [
            ...old,
            { ...metadata, source, imported: true },
          ]);
        else {
          await storage.deleteAudio(metadata);
          storage.releaseAudio(source);
          urls.current.delete(source);
          break;
        }
      }
    } catch (e) {
      setError(
        (e as Error).message || "Không nhập được nhạc. Vui lòng thử lại.",
      );
    } finally {
      loadingImport.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const removeImport = async (track: Track) => {
    const metadata = writer.current
      .current()
      .imports.find((t) => t.id === track.id);
    if (!metadata) return;
    if (trackRef.current?.id === track.id) {
      transport.clear();
      trackRef.current = null;
      setActiveId(null);
    }
    if (
      await change((s) => ({
        ...s,
        imports: s.imports.filter((t) => t.id !== track.id),
        favorites: s.favorites.filter((id) => id !== track.id),
        playlists: s.playlists.map((p) => ({
          ...p,
          trackIds: p.trackIds.filter((id) => id !== track.id),
        })),
      }))
    ) {
      const pruned = stateRef.current.queue.filter((id) => id !== track.id);
      stateRef.current.queue = pruned;
      setQueue(pruned);
      setImports((old) => old.filter((t) => t.id !== track.id));
      try {
        await storage.deleteAudio(metadata);
      } catch {
        setError("Đã gỡ bài khỏi thư viện nhưng chưa xóa được bản sao cục bộ.");
      }
      storage.releaseAudio(String(track.source));
      urls.current.delete(String(track.source));
    }
  };
  const seek = async (seconds: number) => {
    try {
      ended.current = false;
      await transport.seek(seconds);
    } catch {
      setError("Không tua được bài hát. Hãy thử lại.");
    }
  };
  return {
    library,
    tracks,
    ready,
    writable,
    error,
    setError,
    busy,
    activeTrack,
    queue,
    shuffle,
    repeat,
    status,
    play,
    next,
    seek,
    togglePlay: () => {
      if (!activeTrack) {
        play(tracksRef.current[0]);
        return;
      }
      try {
        transport.toggle();
      } catch {
        setError("Không phát được âm thanh. Hãy nhấn phát lại.");
      }
    },
    toggleShuffle: () => setShuffle((v) => !v),
    toggleRepeat: () =>
      setRepeat((v) => (v === "off" ? "all" : v === "all" ? "one" : "off")),
    volume: transport.volume(),
    canControlVolume: canControlVolume(),
    setVolume: (value: number) => {
      transport.setVolume(value);
      void change((s) => ({ ...s, volume: value }));
    },
    like: (id: string) => change((s) => toggleFavorite(s, id)),
    remember: (query: string) =>
      change((s) => ({
        ...s,
        recentSearches: rememberSearch(s.recentSearches, query),
      })),
    removeRecent: (query: string) =>
      change((s) => ({
        ...s,
        recentSearches: removeRecent(s.recentSearches, query),
      })),
    clearRecent: () => change((s) => ({ ...s, recentSearches: [] })),
    createPlaylist: (name: string) => {
      const id = "playlist-" + Crypto.randomUUID();
      return change((s) => createPlaylist(s, name, id)).then((ok) =>
        ok ? id : null,
      );
    },
    deletePlaylist: (id: string) =>
      change((s) => ({
        ...s,
        playlists: s.playlists.filter((p) => p.id !== id),
      })),
    add: (playlistId: string, trackId: string) =>
      change((s) => addToPlaylist(s, playlistId, trackId)),
    remove: (playlistId: string, trackId: string) =>
      change((s) => removeFromPlaylist(s, playlistId, trackId)),
    importing,
    removeImport,
  };
}
const MusicContext = createContext<ReturnType<typeof useMusicState> | null>(
  null,
);
export function MusicProvider({ children }: { children: ReactNode }) {
  const value = useMusicState();
  return <MusicContext value={value}>{children}</MusicContext>;
}
export function useMusic() {
  const value = use(MusicContext);
  if (!value) throw new Error("MusicProvider is required");
  return value;
}
