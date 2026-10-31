import type { Track } from "./types";
interface Player {
  currentTime: number;
  duration: number;
  volume: number;
  playing: boolean;
  replace(source: string | number | null): void;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
}
export function createTransport(
  player: Player,
  onError: (message: string) => void = () => {},
  canSetVolume = true,
) {
  let generation = 0;
  let current: Track | null = null;
  let desiredPlaying = false;
  let volume = 0.8;
  const pause = () => {
    generation++;
    desiredPlaying = false;
    player.pause();
  };
  const restart = () => {
    const request = ++generation;
    desiredPlaying = true;
    void player
      .seekTo(0)
      .then(() => {
        if (request === generation && desiredPlaying) player.play();
      })
      .catch(() => onError("Không phát lại được bài hát. Hãy thử lại."));
  };
  const play = (track: Track) => {
    generation++;
    desiredPlaying = true;
    const same = current?.id === track.id;
    if (!same) {
      player.pause();
      player.replace(track.source);
      if (canSetVolume) player.volume = volume;
      current = track;
    }
    if (
      same &&
      player.duration > 0 &&
      player.currentTime >= player.duration - 0.2
    ) {
      restart();
      return;
    }
    player.play();
  };
  return {
    play,
    pause,
    restart,
    toggle: () => {
      if (player.playing) pause();
      else if (current) play(current);
    },
    async seek(seconds: number) {
      if (
        !Number.isFinite(seconds) ||
        !Number.isFinite(player.duration) ||
        player.duration <= 0
      )
        throw new Error("Chờ bài hát tải xong trước khi tua.");
      const request = ++generation;
      const resume = desiredPlaying;
      await player.seekTo(Math.max(0, Math.min(player.duration, seconds)));
      if (request === generation && resume && !player.playing) player.play();
    },
    setVolume: (value: number) => {
      volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.8));
      if (canSetVolume) player.volume = volume;
    },
    volume: () => volume,
    clear: () => {
      pause();
      player.replace(null);
      current = null;
    },
  };
}
