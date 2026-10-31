// Research adapter for an already authenticated Spotify Web Player.
// Never bundled into the application. Installing it does not establish ad blocking.
export function installStateInterceptor(
  environment,
  transform,
  { enabled = false } = {},
) {
  const prototype = environment.Response.prototype;
  const metrics = {
    active: true,
    enabled: enabled === true,
    responses: 0,
    adResponses: 0,
    changedEdges: 0,
    unresolved: 0,
    errors: 0,
    lastAdGraph: null,
  };
  const originals = [];
  const eligible = (value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        (url.hostname === "spclient.wg.spotify.com" ||
          /^[a-z0-9-]+-spclient\.spotify\.com$/.test(url.hostname)) &&
        /^\/track-playback\/v1\/devices\/[^/]+\/(state|state_conflict)$/.test(
          url.pathname,
        )
      );
    } catch {
      return false;
    }
  };
  const hasAds = (value) => {
    const tracks = value?.state_machine?.tracks;
    if (
      Array.isArray(tracks) &&
      tracks.length <= 1024 &&
      tracks.some((t) => t?.content_type === "AD")
    )
      return true;
    return (
      Array.isArray(value?.payloads) &&
      value.payloads.length <= 128 &&
      value.payloads.some(
        (p) =>
          Array.isArray(p?.state_machine?.tracks) &&
          p.state_machine.tracks.length <= 1024 &&
          p.state_machine.tracks.some((t) => t?.content_type === "AD"),
      )
    );
  };
  const restore = () => {
    for (const { method, original, wrapper } of originals) {
      if (prototype[method] === wrapper) prototype[method] = original;
    }
    metrics.active = false;
  };
  try {
    for (const method of ["json", "text"]) {
      const original = prototype[method];
      const wrapper = function (...args) {
        const promise = Reflect.apply(original, this, args);
        if (!eligible(this.url)) return promise;
        return promise.then((value) => {
          let decoded = value;
          if (method === "text") {
            if (typeof value !== "string" || value.length > 1024 * 1024)
              return value;
            try {
              decoded = JSON.parse(value);
            } catch {
              return value;
            }
          }
          metrics.responses++;
          if (hasAds(decoded)) {
            metrics.adResponses++;
            const machine = decoded?.state_machine;
            if (
              machine?.states?.length <= 32 &&
              machine?.tracks?.length <= 32
            ) {
              metrics.lastAdGraph = machine.states.map((state) => ({
                type: machine.tracks[state?.track]?.content_type ?? "unknown",
                advance: Number.isInteger(
                  state?.transitions?.advance?.state_index,
                )
                  ? state.transitions.advance.state_index
                  : null,
                next: Number.isInteger(
                  state?.transitions?.skip_next?.state_index,
                )
                  ? state.transitions.skip_next.state_index
                  : null,
              }));
            }
          }
          if (!metrics.enabled) return value;
          try {
            const result = transform(decoded);
            metrics.unresolved += result.unresolved;
            if (!result.changes) return value;
            metrics.changedEdges += result.changes;
            return method === "text"
              ? JSON.stringify(result.payload)
              : result.payload;
          } catch {
            metrics.errors++;
            return value;
          }
        });
      };
      prototype[method] = wrapper;
      originals.push({ method, original, wrapper });
    }
  } catch (error) {
    restore();
    throw error;
  }
  return {
    snapshot: () => ({ ...metrics }),
    setEnabled: (value) => {
      metrics.enabled = value === true;
    },
    restore,
  };
}
