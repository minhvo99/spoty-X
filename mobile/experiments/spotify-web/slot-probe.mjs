// Research only. Not imported by the application or included in the Pages build.
export function createSlotProbe(connector, { capacity = 128 } = {}) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 256) {
    throw new Error("Capacity must be between 1 and 256");
  }
  // These enumerated slot names were observed in the pinned Web Player bundle.
  const publicSlots = new Set([
    "stream",
    "preroll",
    "hpto",
    "leaderboard",
    "embedded-npv",
    "embedded-playlist",
    "embedded-playlist-leavebehind",
  ]);
  const methods = [
    "createSlot",
    "enableSlot",
    "fetchSlot",
    "getAd",
    "triggerSlot",
    "clearSlot",
  ];
  const events = [];
  const replacements = [];
  let dropped = 0;
  let active = true;
  const restore = () => {
    for (const { method, descriptor, wrapper } of replacements) {
      // Do not overwrite another tool's subsequent modification.
      if (connector[method] !== wrapper) continue;
      if (descriptor) Object.defineProperty(connector, method, descriptor);
      else delete connector[method];
    }
    active = false;
  };
  try {
    for (const method of methods) {
      const original = connector[method];
      if (typeof original !== "function") continue;
      const descriptor = Object.getOwnPropertyDescriptor(connector, method);
      const wrapper = function (...args) {
        if (events.length < capacity) {
          events.push({
            method,
            slot: publicSlots.has(args[0]) ? args[0] : "other",
            at: Date.now(),
          });
        } else dropped++;
        // Preserve arguments, receiver, return value and exceptions unchanged.
        return Reflect.apply(original, this, args);
      };
      Object.defineProperty(connector, method, {
        value: wrapper,
        writable: true,
        configurable: true,
        enumerable: descriptor?.enumerable ?? false,
      });
      replacements.push({ method, descriptor, wrapper });
    }
  } catch (error) {
    restore();
    throw error;
  }
  return {
    snapshot: () => ({
      active,
      events: events.map((e) => ({ ...e })),
      dropped,
    }),
    restore,
  };
}

export function installSlotProbe(environment, factory) {
  const supportedSource =
    "https://open.spotifycdn.com/cdn/build/web-player/web-player.f954508a.js";
  if (
    environment.location.origin !== "https://open.spotify.com" ||
    ![...environment.document.querySelectorAll("script[src]")].some(
      (s) => s.src === supportedSource,
    )
  ) {
    throw new Error("Unsupported Spotify origin or Web Player build");
  }
  if (environment.__spotyxSlotProbe?.snapshot().active) {
    return environment.__spotyxSlotProbe.snapshot();
  }
  const chunks = environment.rspackChunk;
  if (!chunks || typeof chunks.push !== "function")
    throw new Error("Spotify runtime unavailable");
  let runtime;
  const chunkName = `spotyx-reference-observer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  chunks.push([
    [chunkName],
    {},
    (require) => {
      runtime = require;
    },
  ]);
  if (typeof runtime !== "function")
    throw new Error("Spotify runtime adapter unavailable");
  // Module and export were identified statically in this exact bundle.
  const connector = runtime(26222).adsCoreConnector;
  if (
    !connector ||
    !["createSlot", "clearSlot", "enableSlot", "getAd"].every(
      (m) => typeof connector[m] === "function",
    )
  ) {
    throw new Error("Unsupported advertising connector");
  }
  environment.__spotyxSlotProbe = factory(connector);
  return environment.__spotyxSlotProbe.snapshot();
}
