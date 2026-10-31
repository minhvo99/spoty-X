import { test, expect } from "vitest";
import { createTransport } from "./transport";
import type { Track } from "./types";
const a: Track = {
  id: "a",
  title: "A",
  artist: "Artist",
  collection: "Collection",
  genre: "Jazz",
  color: "#123456",
  source: "a.mp3",
};
const b: Track = { ...a, id: "b", source: "b.mp3" };
function backend() {
  return {
    currentTime: 0,
    duration: 100,
    volume: 0.8,
    playing: false,
    source: "",
    replace(source: string | number | null) {
      this.source = String(source);
      this.currentTime = 0;
      this.volume = 1;
    },
    play() {
      this.playing = true;
    },
    pause() {
      this.playing = false;
    },
    async seekTo(seconds: number) {
      this.currentTime = seconds;
    },
  };
}
test("track replacement preserves the selected volume", () => {
  const p = backend(),
    t = createTransport(p);
  t.setVolume(0.05);
  t.play(a);
  expect(p.volume).toBe(0.05);
  t.play(b);
  expect(p.volume).toBe(0.05);
});
test("main play restarts finished audio even when the native backend does not rewind", async () => {
  const p = backend(),
    t = createTransport(p);
  t.play(a);
  p.currentTime = 100;
  p.playing = false;
  t.toggle();
  await Promise.resolve();
  expect(p.currentTime).toBe(0);
  expect(p.playing).toBe(true);
});
test("late seek completion cannot resume playback after a newer pause", async () => {
  const p = backend();
  let release!: () => void;
  p.seekTo = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  const t = createTransport(p);
  t.play(a);
  p.currentTime = 100;
  p.playing = false;
  t.toggle();
  t.pause();
  release();
  await Promise.resolve();
  expect(p.playing).toBe(false);
});
test("late restart cannot play a newly selected then paused track", async () => {
  const p = backend();
  let release!: () => void;
  p.seekTo = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  const t = createTransport(p);
  t.play(a);
  p.currentTime = 100;
  p.playing = false;
  t.toggle();
  t.play(b);
  t.pause();
  release();
  await Promise.resolve();
  expect(p.source).toBe("b.mp3");
  expect(p.playing).toBe(false);
});
