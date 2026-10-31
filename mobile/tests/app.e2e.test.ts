import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { chromium } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
let browser: Browser;
let base: string;
const dist = resolve("dist");
const server = createServer(async (req, res) => {
  const url = new URL(req.url!, "http://127.0.0.1");
  if (!url.pathname.startsWith("/spoty-X/")) {
    res.writeHead(404).end();
    return;
  }
  const path = resolve(
    dist,
    "." +
      decodeURIComponent(
        url.pathname.slice("/spoty-X".length) || "/index.html",
      ),
  );
  const file = url.pathname.endsWith("/") ? resolve(path, "index.html") : path;
  if (!file.startsWith(dist + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const content = await readFile(file);
    res.setHeader(
      "Content-Type",
      (
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".json": "application/json",
          ".svg": "image/svg+xml",
          ".ico": "image/x-icon",
          ".mp3": "audio/mpeg",
          ".ttf": "font/ttf",
        } as Record<string, string>
      )[extname(file)] ?? "application/octet-stream",
    );
    res.setHeader("Accept-Ranges", "bytes");
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]),
        end = Math.min(
          content.length - 1,
          range[2] ? Number(range[2]) : content.length - 1,
        );
      if (start > end || start >= content.length) {
        res
          .writeHead(416, { "Content-Range": `bytes */${content.length}` })
          .end();
        return;
      }
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${content.length}`,
        "Content-Length": end - start + 1,
      });
      res.end(content.subarray(start, end + 1));
    } else {
      res.setHeader("Content-Length", content.byteLength);
      res.end(content);
    }
  } catch {
    res.writeHead(404).end();
  }
});
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === "object" ? address!.port : 0}/spoty-X/`;
  browser = await chromium.launch({ headless: true });
  await mkdir("test-results", { recursive: true });
}, 30000);
afterAll(async () => {
  await browser?.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
async function openPage(width = 390, init?: () => void) {
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    isMobile: width < 800,
    hasTouch: width < 800,
  });
  page.setDefaultTimeout(8000);
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as any).__actualAudio = this;
      return original.call(this);
    };
  });
  if (init) await page.addInitScript(init);
  await page.goto(base);
  await page.getByRole("button", { name: "Nghe ngay", exact: true }).waitFor();
  return page;
}
const activeAudio = async (page: Page) => {
  await page.waitForFunction(
    () => {
      const a = (window as any).__actualAudio as HTMLAudioElement;
      return a && !a.paused && a.duration > 100 && a.currentTime > 0.4;
    },
    {},
    { timeout: 15000 },
  );
};
const currentTime = (page: Page) =>
  page.evaluate(
    () => ((window as any).__actualAudio as HTMLAudioElement).currentTime,
  );
async function search(page: Page, query: string) {
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm kiếm nhạc" }).fill(query);
}

describe("Spoty-X real audio player", () => {
  test("phone renders no-key app at Pages subpath and plays actual full audio", async () => {
    const page = await openPage();
    const errors: string[] = [];
    const external: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (new URL(r.url()).origin !== new URL(base).origin)
        external.push(r.url());
    });
    expect(
      await page.getByRole("textbox", { name: /Client ID|API key/ }).count(),
    ).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/phone-home.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Nghe ngay", exact: true }).click();
    await activeAudio(page);
    const start = await currentTime(page);
    await page.waitForTimeout(650);
    expect(await currentTime(page)).toBeGreaterThan(start + 0.25);
    await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
    const paused = await currentTime(page);
    await page.waitForTimeout(350);
    expect(await currentTime(page)).toBeLessThan(paused + 0.1);
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    await page.close();
  });
  test("real seek/next/previous and natural queue advance work on a phone", async () => {
    const page = await openPage();
    await page.getByRole("button", { name: "Nghe ngay", exact: true }).click();
    await activeAudio(page);
    await page
      .getByRole("button", { name: "Mở trình phát", exact: true })
      .click();
    const slider = page.getByTestId("seek-slider");
    await slider.fill("30");
    await page.waitForFunction(
      () => Math.abs((window as any).__actualAudio.currentTime - 30) < 3,
    );
    await page
      .getByRole("button", { name: "Bài tiếp theo", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Dream Culture", exact: true })
      .waitFor();
    await activeAudio(page);
    await page.getByRole("button", { name: "Bài trước", exact: true }).click();
    await page
      .getByRole("heading", { name: "Carefree", exact: true })
      .waitFor();
    await activeAudio(page);
    const duration = await page.evaluate(
      () => (window as any).__actualAudio.duration,
    );
    await slider.fill(String(Math.floor(duration) - 1));
    await page
      .getByRole("heading", { name: "Dream Culture", exact: true })
      .waitFor({ timeout: 10000 });
    await activeAudio(page);
    await page.screenshot({
      path: "test-results/phone-player.png",
      fullPage: true,
    });
    await page.close();
  });
  test("search matches accents, filters, records/removes/clears and persists history", async () => {
    const page = await openPage();
    await search(page, "tap trung");
    await page
      .getByRole("button", { name: "Phát Dream Culture", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Lọc Bộ sưu tập", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Phát Dream Culture", exact: true })
      .waitFor();
    await page.getByRole("textbox", { name: "Tìm kiếm nhạc" }).press("Enter");
    await page
      .getByRole("button", { name: "Xóa từ khóa", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Tìm lại tap trung", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: "Tìm lại tap trung", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Xóa tìm kiếm tap trung", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Bắt đầu từ một giai điệu", exact: true })
      .waitFor();
    await page.getByRole("textbox", { name: "Tìm kiếm nhạc" }).fill("Carefree");
    await page.getByRole("textbox", { name: "Tìm kiếm nhạc" }).press("Enter");
    await page
      .getByRole("button", { name: "Xóa từ khóa", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Xóa lịch sử", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Bắt đầu từ một giai điệu", exact: true })
      .waitFor();
    await page.close();
  });
  test("favorites and playlists persist and play their saved queue", async () => {
    const page = await openPage();
    await page
      .getByRole("button", { name: "Thích Carefree", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Thêm Carefree vào playlist", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Tên playlist mới" })
      .fill("Buổi sáng");
    await page
      .getByRole("button", { name: "Tạo và thêm bài hát", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Buổi sáng", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: "Phát danh sách", exact: true })
      .click();
    await activeAudio(page);
    await page
      .getByRole("button", { name: "Gỡ Carefree khỏi danh sách", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Thêm một bài bạn thích", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Xóa playlist", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Thư viện của bạn", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Mở Bài đã thích", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Bỏ thích Carefree", exact: true })
      .waitFor();
    await page.close();
  });
  test("imported audio is stored as a durable blob and plays after reload", async () => {
    const page = await openPage();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Nhập nhạc từ thiết bị", exact: true })
      .first()
      .click();
    await (
      await chooser
    ).setFiles({
      name: "Nguyễn An - Đêm muộn.mp3",
      mimeType: "audio/mpeg",
      buffer: await readFile("assets/audio/carefree.mp3"),
    });
    await page
      .getByRole("button", { name: "Phát Đêm muộn", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: "Phát Đêm muộn", exact: true })
      .click();
    await activeAudio(page);
    expect(
      await page.evaluate(() =>
        (window as any).__actualAudio.src.startsWith("blob:"),
      ),
    ).toBe(true);
    await search(page, "dem muon");
    await page
      .getByRole("button", { name: "Phát Đêm muộn", exact: true })
      .waitFor();
    await page.close();
  });
  test("empty and rapid searches are truthful and mobile tabs stay visible", async () => {
    const page = await openPage(360);
    await search(page, "no-such-song");
    await page
      .getByRole("heading", { name: "Không tìm thấy bài hát", exact: true })
      .waitFor();
    await page.getByRole("textbox", { name: "Tìm kiếm nhạc" }).fill("care");
    await page.getByRole("textbox", { name: "Tìm kiếm nhạc" }).fill("cipher");
    await page
      .getByRole("button", { name: "Phát Cipher", exact: true })
      .waitFor();
    expect(
      await page
        .getByRole("button", { name: "Phát Carefree", exact: true })
        .count(),
    ).toBe(0);
    expect(
      await page
        .getByRole("button", { name: "Thư viện", exact: true })
        .isVisible(),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/phone-search.png",
      fullPage: true,
    });
    await page.close();
  });
  test("desktop renders without broken assets or application errors", async () => {
    const page = await openPage(1440);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.screenshot({
      path: "test-results/desktop-home.png",
      fullPage: true,
    });
    expect(await page.title()).toBe("Spoty-X");
    expect(await page.evaluate(() => document.documentElement.lang)).toBe("vi");
    await page.getByRole("button", { name: "Nghe ngay", exact: true }).click();
    await activeAudio(page);
    expect(errors).toEqual([]);
    await page.close();
  });
  test("a blob-storage failure preserves saved metadata before subsequent writes", async () => {
    const page = await openPage(390, () => {
      localStorage.setItem(
        "spotyx.library.v2",
        JSON.stringify({
          favorites: ["cipher"],
          playlists: [{ id: "keep", name: "Keep me", trackIds: ["cipher"] }],
          recentSearches: ["old query"],
          recentlyPlayed: [],
          volume: 0.6,
          imports: [
            {
              id: "import-missing",
              title: "Missing",
              artist: "Me",
              collection: "Nhạc đã nhập",
              genre: "Local",
              color: "#bb835e",
              fileName: "Missing.mp3",
            },
          ],
        }),
      );
      indexedDB.open = () => {
        throw new Error("blocked for regression");
      };
    });
    await page
      .getByRole("button", { name: "Thích Carefree", exact: true })
      .click();
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("spotyx.library.v2")!).favorites.includes(
        "carefree",
      ),
    );
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("spotyx.library.v2")!),
    );
    expect(saved.favorites).toContain("cipher");
    expect(saved.playlists[0].name).toBe("Keep me");
    expect(saved.imports[0].id).toBe("import-missing");
    expect(saved.recentSearches).toContain("old query");
    await page.close();
  });
  test("changing tracks retains the real audio volume", async () => {
    const page = await openPage();
    await page.getByRole("button", { name: "Nghe ngay", exact: true }).click();
    await activeAudio(page);
    await page
      .getByRole("button", { name: "Mở trình phát", exact: true })
      .click();
    await page.getByTestId("volume-slider").fill("0.05");
    await page.waitForFunction(
      () => (window as any).__actualAudio.volume < 0.1,
    );
    await page
      .getByRole("button", { name: "Bài tiếp theo", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Dream Culture", exact: true })
      .waitFor();
    await activeAudio(page);
    expect(
      await page.evaluate(() => (window as any).__actualAudio.volume),
    ).toBeCloseTo(0.05, 2);
    await page.close();
  });
  test("removing an imported track does not block advancement past its old queue position", async () => {
    const page = await openPage();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Nhập nhạc từ thiết bị", exact: true })
      .first()
      .click();
    await (
      await chooser
    ).setFiles({
      name: "Test - Alpha.mp3",
      mimeType: "audio/mpeg",
      buffer: await readFile("assets/audio/carefree.mp3"),
    });
    await page
      .getByRole("button", { name: "Phát Alpha", exact: true })
      .waitFor();
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("spotyx.library.v2")!);
      s.playlists.push({
        id: "queue-test",
        name: "Queue test",
        trackIds: ["carefree", s.imports[0].id, "cipher"],
      });
      localStorage.setItem("spotyx.library.v2", JSON.stringify(s));
    });
    await page.reload();
    await page.getByRole("button", { name: "Thư viện", exact: true }).click();
    await page
      .getByRole("button", { name: "Mở Queue test", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Phát danh sách", exact: true })
      .click();
    await activeAudio(page);
    await page
      .getByRole("button", { name: "Thư viện", exact: true })
      .last()
      .click();
    await page
      .getByRole("button", { name: "Mở Nhạc đã nhập", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Gỡ Alpha khỏi danh sách", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Thêm một bài bạn thích", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Bài tiếp theo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Mở trình phát", exact: true })
      .click();
    await page.getByRole("heading", { name: "Cipher", exact: true }).waitFor();
    await page.close();
  });
  test("metadata read failures cannot overwrite the saved library after storage recovers", async () => {
    const page = await openPage(390, () => {
      localStorage.setItem(
        "spotyx.library.v2",
        JSON.stringify({
          favorites: ["cipher"],
          playlists: [
            { id: "safe", name: "Safe playlist", trackIds: ["cipher"] },
          ],
          recentSearches: [],
          recentlyPlayed: [],
          imports: [],
          volume: 0.5,
        }),
      );
      (window as any).__denyMetadata = true;
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === "spotyx.library.v2" && (window as any).__denyMetadata)
          throw new Error("read unavailable");
        return original.call(this, key);
      };
    });
    await page.evaluate(() => {
      (window as any).__denyMetadata = false;
    });
    await page.getByRole("button", { name: "Nghe ngay", exact: true }).click();
    await activeAudio(page);
    const state = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("spotyx.library.v2")!),
    );
    expect(state.favorites).toEqual(["cipher"]);
    expect(state.playlists[0].name).toBe("Safe playlist");
    await page.close();
  });
  test("unreadable audio shows an error and another song still plays", async () => {
    const page = await openPage();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Nhập nhạc từ thiết bị", exact: true })
      .first()
      .click();
    await (
      await chooser
    ).setFiles({
      name: "Broken.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("This is not audio"),
    });
    await page
      .getByRole("button", { name: "Phát Broken", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Không đọc được âm thanh" })
      .waitFor();
    await page
      .getByRole("button", { name: "Phát Carefree", exact: true })
      .click();
    await activeAudio(page);
    expect(await page.getByRole("alert").count()).toBe(0);
    await page.close();
  });
});
