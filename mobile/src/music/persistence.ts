import type { ImportedTrack, Library } from "./types";
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export function createWriter(
  initial: Library,
  persist: (state: Library) => Promise<void>,
) {
  let value = initial;
  let chain = Promise.resolve();
  return {
    current: () => value,
    change: (update: (state: Library) => Library) => {
      const job = chain
        .catch(() => {})
        .then(async () => {
          const next = update(value);
          await persist(next);
          value = next;
          return next;
        });
      chain = job.then(
        () => {},
        () => {},
      );
      return job;
    },
  };
}
export function importMetadata(
  asset: { name: string; size?: number; mimeType?: string },
  id: string,
): ImportedTrack {
  if (
    asset.size !== undefined &&
    (!Number.isFinite(asset.size) ||
      asset.size < 0 ||
      asset.size > MAX_IMPORT_BYTES)
  )
    throw new Error("Mỗi tệp nhạc cần nhỏ hơn 25 MB.");
  if (!/\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i.test(asset.name))
    throw new Error(
      "Chọn tệp âm thanh MP3, M4A, AAC, WAV, FLAC, OGG hoặc OPUS.",
    );
  const clean = asset.name
    .replace(/\.[^.]+$/, "")
    .replaceAll("_", " ")
    .trim();
  const parts = clean.split(" - ");
  return {
    id: "import-" + id,
    title:
      (parts.length > 1 ? parts.slice(1).join(" - ") : clean).slice(0, 160) ||
      "Bài hát đã nhập",
    artist: parts.length > 1 ? parts[0].slice(0, 160) : "Nhạc của bạn",
    collection: "Nhạc đã nhập",
    genre: "Local",
    color: "#bb835e",
    fileName: asset.name.slice(0, 200),
  };
}
