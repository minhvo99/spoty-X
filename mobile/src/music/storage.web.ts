import type { DocumentPickerAsset } from "expo-document-picker";
import type { Library, ImportedTrack } from "./types";
import { readLibrary } from "./model";
const KEY = "spotyx.library.v2";
const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("spotyx-audio-v1", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("audio");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("Không mở được bộ nhớ nhạc."));
  });
async function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("audio", mode);
      const req = action(tx.objectStore("audio"));
      let result: T;
      req.onsuccess = () => {
        result = req.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () =>
        reject(tx.error ?? new Error("Không lưu được tệp nhạc."));
      tx.onabort = () =>
        reject(tx.error ?? new Error("Lưu tệp nhạc đã bị hủy."));
    });
  } finally {
    db.close();
  }
}
export const readState = async () => readLibrary(localStorage.getItem(KEY));
export const writeState = async (state: Library) => {
  localStorage.setItem(KEY, JSON.stringify(state));
};
export async function saveAudio(
  asset: DocumentPickerAsset,
  track: ImportedTrack,
): Promise<string> {
  const blob =
    asset.file ??
    (await fetch(asset.uri).then((r) => {
      if (!r.ok) throw new Error("Không đọc được tệp đã chọn.");
      return r.blob();
    }));
  if (!blob) throw new Error("Không đọc được tệp âm thanh.");
  await transact("readwrite", (s) => s.put(blob, track.id));
  return URL.createObjectURL(blob);
}
export async function loadAudio(track: ImportedTrack): Promise<string | null> {
  const blob = await transact<Blob | undefined>("readonly", (s) =>
    s.get(track.id),
  );
  return blob ? URL.createObjectURL(blob) : null;
}
export const deleteAudio = async (track: ImportedTrack) => {
  await transact("readwrite", (s) => s.delete(track.id));
};
export const releaseAudio = (source: string) => {
  if (source.startsWith("blob:")) URL.revokeObjectURL(source);
};
