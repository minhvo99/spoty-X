# Spotify client-side reference experiments

These are research tools, **not a working Spotify Free integration**. They are
not imported by Expo routes and are not included in the Pages application.
Do not infer successful ad blocking from passing unit tests or installing a
probe in DevTools.

The user requested studying SpotX's local client modifications while retaining
React Native and GitHub Pages. The experiments use the real Spotify Web Player
to check which client-side mechanisms have an equivalent there.

## Files

- `slot-probe.mjs`: bounded observations of advertising connector method names
  and public slot names. Preserves original arguments, receiver, results and
  exceptions. Does not record headers, targeting values or returned data.
  The browser adapter accepts only the observed `web-player.f954508a.js` build.
- `state-graph.mjs`: an original, experimental transformation of explicit `AD`
  states. Keeps songs and IDs intact and uses existing forward transitions.
  Terminal ad placeholders can use an explicitly supplied next-song edge.
  Incomplete or cyclic graphs without a valid route pass through unchanged.
- `state-interceptor.mjs`: reversible JSON/text response interception scoped to
  Spotify's observed track-playback state endpoint. Defaults to observation.
  Its summary excludes device IDs, state IDs, names, URLs, cookies and tokens.

A separate throwaway media-seek/config trial was retained only in the ignored
local directory `.superpowers/rea/web-player/media-ad-trial.mjs`. It did not
establish skipped advertisements and is not part of this source deliverable.

Spotify's existing client handles authentication, media licenses and audio
decoding in these experiments. No captured credential is supplied through chat
or written to the source. Original Spotify bundles and private runtime captures
remain in ignored local directories, not in Git.

## Verification

From `mobile/`:

```sh
npm exec -- vitest run --config vitest.spotify-probe.config.ts
npm test
npm run lint
npm run typecheck
```

The dedicated suite exercises protocol-shaped synthetic data, not a Spotify
account. Runtime observations and their limits are recorded separately in
[`docs/evidence/spotx-web-investigation.md`](../../../docs/evidence/spotx-web-investigation.md).

## Sources and scope

Primary reference: [SpotX source](https://github.com/SpotX-Official/SpotX),
especially version-gated advertising flag, audio subscription and native slot
patches. Web state-machine field names were additionally cross-checked against
the [SpotiAds source](https://github.com/tomer8007/spotify-web-ads-remover) and
sanitized structural observations of the current Web Player. No source from
that project is vendored in these experiments.

The current runtime trial observed an actual multi-ad break continuing through
the graph transformation. Therefore this is **not ready for deployment**.
Ordinary Pages JavaScript cannot inject these hooks into Spotify's separate
origin. A DevTools-only experiment inside Spotify does not resolve that
integration constraint.
