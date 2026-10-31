import { test, expect } from "vitest";
import { createWriter, importMetadata, MAX_IMPORT_BYTES } from "./persistence";
import { initialLibrary, toggleFavorite } from "./model";
test("serialized persistence applies queued actions against the latest committed state", async () => {
  const writes: string[][] = [];
  const writer = createWriter(initialLibrary(), async (s) => {
    await new Promise((r) => setTimeout(r, 3));
    writes.push(s.favorites);
  });
  await Promise.all([
    writer.change((s) => toggleFavorite(s, "a")),
    writer.change((s) => toggleFavorite(s, "b")),
  ]);
  expect(writer.current().favorites).toEqual(["a", "b"]);
  expect(writes).toEqual([["a"], ["a", "b"]]);
});
test("failed writes preserve previous state and a later retry still works", async () => {
  let fail = true;
  const writer = createWriter(initialLibrary(), async () => {
    if (fail) throw new Error("quota");
  });
  await expect(writer.change((s) => toggleFavorite(s, "a"))).rejects.toThrow(
    "quota",
  );
  expect(writer.current().favorites).toEqual([]);
  fail = false;
  await writer.change((s) => toggleFavorite(s, "a"));
  expect(writer.current().favorites).toEqual(["a"]);
});
test("imports reject oversize/non-audio files and derive artist/title without extensions", () => {
  expect(() =>
    importMetadata({ name: "x.mp3", size: MAX_IMPORT_BYTES + 1 }, "id"),
  ).toThrow();
  expect(() => importMetadata({ name: "x.txt", size: 1 }, "id")).toThrow();
  expect(
    importMetadata({ name: "Nguyễn An - Đêm muộn.mp3", size: 40 }, "id"),
  ).toMatchObject({
    id: "import-id",
    artist: "Nguyễn An",
    title: "Đêm muộn",
    fileName: "Nguyễn An - Đêm muộn.mp3",
  });
});
test("a failed save without a follow-up action does not leak an unhandled queue rejection", async () => {
  const writer = createWriter(initialLibrary(), async () => {
    throw new Error("quota");
  });
  await expect(writer.change((s) => toggleFavorite(s, "a"))).rejects.toThrow(
    "quota",
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(writer.current().favorites).toEqual([]);
});
