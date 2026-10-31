import { describe, test, expect } from "vitest";
import {
  normalize,
  searchLibrary,
  rememberSearch,
  removeRecent,
  advanceQueue,
  readLibrary,
  addToPlaylist,
  removeFromPlaylist,
  toggleFavorite,
  createPlaylist,
  initialLibrary,
} from "./model";
import type { Track } from "./types";
const tracks: Track[] = [
  {
    id: "one",
    title: "Bình minh",
    artist: "Nguyễn An",
    collection: "Tập trung",
    genre: "Ambient",
    color: "#abc",
    source: 1,
  },
  {
    id: "two",
    title: "An bình",
    artist: "Bình",
    collection: "Ban mai",
    genre: "Piano",
    color: "#abc",
    source: 2,
  },
  {
    id: "three",
    title: "Đêm muộn",
    artist: "An",
    collection: "Bình minh",
    genre: "Jazz",
    color: "#abc",
    source: 3,
  },
];
describe("search", () => {
  test("normalizes Vietnamese accents, đ, case and whitespace", () => {
    expect(normalize("  ĐÊM   muộn ")).toBe("dem muon");
  });
  test("ranks exact title before prefix, artist and collection matches", () => {
    expect(searchLibrary(tracks, "binh minh").map((t) => t.id)).toEqual([
      "one",
      "three",
    ]);
    expect(searchLibrary(tracks, "binh").map((t) => t.id)[0]).toBe("one");
  });
  test("requires every search token and supports entity filter", () => {
    expect(searchLibrary(tracks, "binh nguyen").map((t) => t.id)).toEqual([
      "one",
    ]);
    expect(searchLibrary(tracks, "binh", "artists").map((t) => t.id)).toEqual([
      "two",
    ]);
    expect(searchLibrary(tracks, "", "songs")).toEqual([]);
  });
  test("does not mutate catalog or return matches for punctuation only", () => {
    expect(searchLibrary(tracks, "!!!")).toEqual([]);
    expect(tracks[0].id).toBe("one");
  });
});
describe("history and durable library", () => {
  test("recent searches are normalized-deduplicated and capped at ten", () => {
    const a = rememberSearch(["Bình minh", "Old"], "binh minh");
    expect(a).toEqual(["binh minh", "Old"]);
    expect(
      rememberSearch(
        Array.from({ length: 12 }, (_, i) => `q${i}`),
        "new",
      ),
    ).toHaveLength(10);
  });
  test("individual history removal leaves other entries", () => {
    expect(removeRecent(["A", "B"], "A")).toEqual(["B"]);
    expect(rememberSearch(["A"], "  ")).toEqual(["A"]);
  });
  test("malformed saved state recovers defaults and validates imported sources", () => {
    expect(readLibrary("{")).toEqual(initialLibrary());
    const s = readLibrary(
      JSON.stringify({
        favorites: ["one", 3, "one"],
        playlists: [{ id: "a", name: "X", trackIds: ["one", "one", 3] }],
        imports: [{ id: "x", source: "https://bad.test" }],
        volume: 9,
      }),
    );
    expect(s.favorites).toEqual(["one"]);
    expect(s.playlists[0].trackIds).toEqual(["one"]);
    expect(s.imports).toEqual([]);
    expect(s.volume).toBe(1);
  });
  test("playlist operations reject empty names and avoid duplicate songs", () => {
    expect(() => createPlaylist(initialLibrary(), "", "x")).toThrow();
    const s = createPlaylist(initialLibrary(), "  My mix  ", "mix");
    expect(s.playlists[0].name).toBe("My mix");
    const a = addToPlaylist(addToPlaylist(s, "mix", "one"), "mix", "one");
    expect(a.playlists[0].trackIds).toEqual(["one"]);
    expect(removeFromPlaylist(a, "mix", "one").playlists[0].trackIds).toEqual(
      [],
    );
  });
  test("favorites toggle without changing old state", () => {
    const old = initialLibrary();
    const liked = toggleFavorite(old, "one");
    expect(liked.favorites).toEqual(["one"]);
    expect(toggleFavorite(liked, "one").favorites).toEqual([]);
    expect(old.favorites).toEqual([]);
  });
});
describe("queue", () => {
  test("moves both directions and stops at queue boundaries", () => {
    expect(advanceQueue(["a", "b"], "a", { direction: 1 })).toBe("b");
    expect(advanceQueue(["a", "b"], "b", { direction: 1 })).toBe(null);
    expect(advanceQueue(["a", "b"], "b", { direction: -1 })).toBe("a");
  });
  test("repeat one applies only to natural completion; repeat all wraps", () => {
    expect(advanceQueue(["a", "b"], "a", { repeat: "one", ended: true })).toBe(
      "a",
    );
    expect(advanceQueue(["a", "b"], "a", { repeat: "one" })).toBe("b");
    expect(advanceQueue(["a", "b"], "b", { repeat: "all" })).toBe("a");
  });
  test("shuffle avoids the active track and handles empty/single queues", () => {
    expect(
      advanceQueue(["a", "b", "c"], "b", { shuffle: true, random: () => 0 }),
    ).toBe("a");
    expect(advanceQueue([], "a", {})).toBe(null);
    expect(advanceQueue(["a"], "a", { shuffle: true })).toBe(null);
  });
});
