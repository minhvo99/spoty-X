import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import type { DocumentPickerAsset } from "expo-document-picker";
import type { Library, ImportedTrack } from "./types";
import { readLibrary } from "./model";
const KEY = "spotyx.library.v2";
const directory = () => new Directory(Paths.document, "spotyx-audio");
const audioFile = (track: ImportedTrack) =>
  new File(
    directory(),
    track.id + "." + track.fileName.split(".").pop()!.toLowerCase(),
  );
export const readState = async () =>
  readLibrary(await AsyncStorage.getItem(KEY));
export const writeState = async (state: Library) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
};
export async function saveAudio(
  asset: DocumentPickerAsset,
  track: ImportedTrack,
): Promise<string> {
  directory().create({ idempotent: true, intermediates: true });
  const target = audioFile(track);
  new File(asset.uri).copy(target);
  return target.uri;
}
export async function loadAudio(track: ImportedTrack): Promise<string | null> {
  const f = audioFile(track);
  return f.exists ? f.uri : null;
}
export const deleteAudio = async (track: ImportedTrack) => {
  const f = audioFile(track);
  if (f.exists) f.delete();
};
export const releaseAudio = (_source: string) => {};
