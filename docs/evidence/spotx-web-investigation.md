# SpotX reference investigation for Spoty-X

Status as of 2026-11-01: Spotify's original Web Player was tested with the user's
authenticated session. Advertising suppression has **not** been established.
The production Spoty-X app has not been changed by this investigation. No
passwords, cookies, access tokens, or signed audio URLs are recorded here.

## Required outcome

Keep React Native and GitHub Pages. Investigate SpotX's client-side ad-blocking
mechanisms as a reference for playing Spotify with a Free account. Users must
not supply API credentials or import music to access Spotify's catalog. The user
explicitly declined switching the deliverable to a patched iOS IPA.

## Source reference

The local upstream revision is
`06f7fa2eac989c84613b2e0efc9b18acaf97f6cb` of
[SpotX-Official/SpotX](https://github.com/SpotX-Official/SpotX).

- `patches/patches.json`, `free.audioads`: a JavaScript replacement that changes
  the audio advertising subscription path; explicitly limited to versions
  1.1.59 through 1.1.92.
- `free.emptyblock`: replaces the enabled advertising flag with its disabled
  value. This is a UI/client flag modification, not evidence of uninterrupted
  audio playback.
- `others.binary.block_slots*`: version-bounded replacements in the desktop
  executable involving advertising slot strings and a payload delimiter.
- `run.ps1`, `Set-BlockSlotsBinaryPatch`: locates and verifies a native patch,
  dispatching by PE architecture. This code requires the desktop client binary;
  it is not an HTTP library or a reusable Spotify playback engine.

## Bounded offline check

Checked the previously extracted `xpui.js` from the Spotify macOS 1.3.6 desktop
artifact, without executing Spotify or modifying the original artifact:

| Reference pattern | Matches in the checked file | Version coverage |
| --- | ---: | --- |
| `free.audioads` | 0 | Outside the rule's supported range |
| `free.emptyblock` | 1 | Within the rule's open-ended version range |
| `free.playlistsponsor` | 0 | Outside the rule's supported range |

Matching one flag does not establish audio ad blocking. Windows native patches
cannot be transplanted into a JavaScript page or an iOS Mach-O executable.

## Browser capability check

Ran a temporary, unauthenticated Playwright/Chromium probe from the actual
`https://minhvo99.github.io/spoty-X/` origin:

| Attempt | Observed result |
| --- | --- |
| Open Spotify in a popup and read its document | `SecurityError` |
| Fetch the Web Player HTML with standard browser fetch | Rejected with `TypeError` |
| Embed the full Web Player in an iframe | Blocked by Spotify's `frame-ancestors` CSP |
| Read the iframe document | `SecurityError` |

This rules out injecting desktop-style patches into an ordinary cross-origin
Spotify popup/iframe from the deployed Pages app. It does not establish that
every Spotify API endpoint rejects cross-origin calls. It also does not test
authenticated playback, license acquisition, or advertising transitions.

The sanitized local probe result is saved in the ignored
`mobile/test-results/spotify-reference/origin-probe.json`.

## Authenticated runtime observations

The user signed into the separate instrumented browser. Their normal Chrome
session was not copied. The user identifies the account as Free; the player
also displayed an "Upgrade to Premium" menu item. A single account-product API
check returned HTTP 429; it was not retried and did not establish a product type.

Playback was verified on an actual detached `VIDEO` media element, not just
the visible progress bar or a remote Spotify Connect device. Examples included
durations of 163.379773 and 205.431065 seconds, advancing media time, readyState
4, a natural transition to the next track and no media error.

The observed root Web Player bundle was
`web-player.f954508a.js`, SHA-256
`56b07fb8c85cbfb71c3ff415d12ae43162194a6dddbeb620ebda1c7c79672e48`.
The vendor bundle was `vendor~web-player.19d7605d.js`, SHA-256
`5667d61865d8f6ce55b37d727603213ebc6680c0958bba51b4d1f2d015ef2679`.
The local static inventory contains 53 observed JavaScript bundles totaling
8,621,331 bytes. This is an observed-source boundary, not all Spotify code.

Relevant requests included `/ads/v2/config`, track-playback state updates,
storage resolution and Widevine license requests. Only sanitized structural
observations were retained in this report. The ad config contained a `stream`
entry with `stream_time_elapsed_ms: 825000` and `linear: true`. The meaning of
that timing value was not conclusively established.

Playback state responses contained `state_machine`, tracks with `content_type`,
states and transitions including `advance` and `skip_next`. This supplies a web
client-side intervention point distinct from SpotX's Windows binary patches.

## Experiments and results

| Experiment | Observed outcome | Conclusion |
| --- | --- | --- |
| Observe the exported ad-slot connector | Installed successfully in the pinned build; no connector calls during the checked music start | Not established as the audio intervention point |
| Rewrite forward edges around explicit `AD` states | Real ad responses detected; one edge/reference modification observed | Does not establish a skipped ad |
| Handle incomplete ad graphs | Real graphs sometimes contained only `AD` states with no forward song state | The transformation passed through these graphs to avoid inventing a song or stalling playback |
| Observe an actual ad break | Three ad media items of 30, 16.613878 and 25.182041 seconds, followed by music | The graph experiment did not remove this break |
| Gated media-seek trial and test-only timing config changes | Config changes were observable, but no actual ad seek was performed in the bounded trial | Unverified; discarded from the versioned source |

One live graph contained a terminal ad placeholder but also an explicit
`skip_next` edge from the current song to another song. The experimental
transformer supports this existing alternative. It never selects a next song
by array order, deletes tracks, or fabricates a future state machine.

The web state-machine schema was additionally cross-checked against the
[SpotiAds source](https://github.com/tomer8007/spotify-web-ads-remover). The
versioned experimental implementation is original; no upstream implementation
or Spotify bundle is redistributed.

## Validation and remaining work

The dedicated Vitest suite contains 20 passing tests for the observer,
transformation and scoped response adapter. They use synthetic protocol-shaped
fixtures and verify preservation of music/IDs, incomplete graphs, cycle
handling, host/path scoping, restoration and omission of private data. They are
not end-to-end proof of skipped Spotify advertising.

The existing 20 unit tests, lint and TypeScript checks were also rerun. The
production app remains unchanged. All live trial hooks and test-only timing
overrides were removed by restoration and an ordinary reload; the authenticated
test player was left paused.

Two required outcomes remain unresolved:

1. Demonstrate an actual ad being suppressed followed by normal music playback,
   including the real incomplete/future-state case without a playback loop.
2. Demonstrate deployment in the requested Pages/React Native product. A hook
   run through DevTools inside Spotify's origin does not give ordinary Pages
   JavaScript permission to modify that origin.

There is no verified Spotify Free ad-blocking feature to deploy from this work.
