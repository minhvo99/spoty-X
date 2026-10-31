import { expect, test } from "vitest";
import { createSlotProbe, installSlotProbe } from "./slot-probe.mjs";

test("observation preserves the real method's receiver and promise identity", async () => {
  const result = Promise.resolve({ secret: "must not appear in observations" });
  const connector = {
    marker: "real receiver",
    fetchSlot(slot, targeting) {
      expect(this.marker).toBe("real receiver");
      expect(slot).toBe("stream");
      expect(targeting).toEqual({ token: "private" });
      return result;
    },
  };
  const probe = createSlotProbe(connector);
  expect(connector.fetchSlot("stream", { token: "private" })).toBe(result);
  await result;
  expect(probe.snapshot()).toMatchObject({
    events: [{ method: "fetchSlot", slot: "stream" }],
  });
  expect(JSON.stringify(probe.snapshot())).not.toMatch(/private|secret/);
  probe.restore();
});

test("observation never requests or clears advertisements by itself", () => {
  let calls = 0;
  const connector = {
    clearSlot() {
      calls++;
    },
  };
  const probe = createSlotProbe(connector);
  expect(calls).toBe(0);
  expect(probe.snapshot().events).toEqual([]);
  probe.restore();
  expect(calls).toBe(0);
});

test("unknown arguments are redacted and the event buffer is bounded", () => {
  const connector = {
    getAd() {
      return undefined;
    },
  };
  const probe = createSlotProbe(connector, { capacity: 2 });
  connector.getAd("user-sensitive-id");
  connector.getAd({ session: "private-session" });
  connector.getAd("preroll");
  expect(probe.snapshot()).toMatchObject({
    events: [
      { method: "getAd", slot: "other" },
      { method: "getAd", slot: "other" },
    ],
    dropped: 1,
  });
  expect(JSON.stringify(probe.snapshot())).not.toMatch(/sensitive|private/);
  probe.restore();
});

test("restoration removes temporary own methods and preserves later modifications", () => {
  class Connector {
    enableSlot() {
      return "original";
    }
  }
  const connector = new Connector();
  const probe = createSlotProbe(connector);
  expect(Object.hasOwn(connector, "enableSlot")).toBe(true);
  probe.restore();
  expect(Object.hasOwn(connector, "enableSlot")).toBe(false);
  expect(connector.enableSlot()).toBe("original");
  const next = createSlotProbe(connector);
  const otherPatch = () => "later";
  connector.enableSlot = otherPatch;
  next.restore();
  expect(connector.enableSlot).toBe(otherPatch);
});

test("an application error propagates unchanged without logging its contents", () => {
  const problem = new Error("session-token-do-not-record");
  const connector = {
    triggerSlot() {
      throw problem;
    },
  };
  const probe = createSlotProbe(connector);
  expect(() => connector.triggerSlot("stream")).toThrow(problem);
  expect(JSON.stringify(probe.snapshot())).not.toContain(problem.message);
  probe.restore();
});

test("unsupported Spotify builds are rejected before accessing their runtime", () => {
  let runtimeAccessed = false;
  const environment = {
    location: { origin: "https://open.spotify.com" },
    document: {
      querySelectorAll: () => [
        { src: "https://open.spotifycdn.com/unknown-build.js" },
      ],
    },
    get rspackChunk() {
      runtimeAccessed = true;
      throw new Error("do not access");
    },
  };
  expect(() => installSlotProbe(environment, createSlotProbe)).toThrow(
    /unsupported/i,
  );
  expect(runtimeAccessed).toBe(false);
});

test("a failed installation restores previously wrapped methods", () => {
  const original = () => "original";
  const connector = { createSlot: original };
  Object.defineProperty(connector, "enableSlot", {
    value: () => {},
    configurable: false,
    writable: false,
  });
  expect(() => createSlotProbe(connector)).toThrow();
  expect(connector.createSlot).toBe(original);
});

test("the browser probe is idempotent while active and can reinstall after restoration", () => {
  const original = () => Promise.resolve({});
  const connector = {
    createSlot: original,
    clearSlot: original,
    enableSlot: original,
    getAd: original,
  };
  const loadedChunks = new Set();
  const environment = {
    location: { origin: "https://open.spotify.com" },
    document: {
      querySelectorAll: () => [
        {
          src: "https://open.spotifycdn.com/cdn/build/web-player/web-player.f954508a.js",
        },
      ],
    },
    rspackChunk: {
      push([ids, , callback]) {
        if (ids.every((id) => loadedChunks.has(id))) return;
        ids.forEach((id) => loadedChunks.add(id));
        callback((id) => {
          expect(id).toBe(26222);
          return { adsCoreConnector: connector };
        });
      },
    },
  };
  installSlotProbe(environment, createSlotProbe);
  const wrapped = connector.createSlot;
  installSlotProbe(environment, createSlotProbe);
  expect(connector.createSlot).toBe(wrapped);
  environment.__spotyxSlotProbe.restore();
  expect(connector.createSlot).toBe(original);
  expect(installSlotProbe(environment, createSlotProbe).active).toBe(true);
  environment.__spotyxSlotProbe.restore();
});
