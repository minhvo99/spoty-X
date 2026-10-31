# Independent Player Implementation Plan

> Execute inline with superpowers:executing-plans; user delegated decisions and authorized push/deploy.

**Goal:** Replace the OAuth client with a working no-key React Native music player.
**Architecture:** Shared pure music/search state, platform persistence/file-import adapters, expo-audio provider, and Expo Router root/query navigation. Six full CC BY tracks and local user audio; no Spotify account/backend dependency.
**Spec:** ../specs/2026-10-31-spotyx-independent-player.md
**Tech stack:** Expo 58, React Native, Expo Router, expo-audio, AsyncStorage/IndexedDB, Vitest + Playwright driver.

## Constraints and review focus

- No API credentials/ad SDK/analytics or Spotify binary/assets in deploy/Git.
- Derive progress from audio; rapid selection must not play an obsolete track.
- Persist imported blobs/files across reload; preserve old data when a save fails.
- Bad state/storage/unsupported audio must show recovery and never crash startup.
- Distinguish static IPA string evidence from proven behavior; no copied proprietary implementation.
- Every play/seek/navigation/playlist control works on phones and desktop.

## Tasks

1. Write failing Vitest tests for pure search/history/library/queue state. Implement `src/music/model.ts`, `types.ts` and tests. Download and verify licensed full audio, document attribution.
2. Build platform storage/import adapters and player provider; write failure/persistence tests for adapters and metadata validation. Integrate actual expo-audio events, queue and repeat.
3. Replace old API app with original Spotify-like UI: home, search, library, playlist and player, using root query routes. Remove OAuth/Spotify SDK/configuration and tests for that deleted architecture.
4. Replace browser tests with Vitest tests against actual local audio, file import and persistence. Run lint/typecheck/export/native JS checks/audit and inspect screenshots.
5. Independent review, fix important findings with regression tests, update evidence/README/CI, commit/push and verify live Pages playback.

## Ledger

- User explicitly authorized implementation choices; no additional design approval gate is needed.
- Reuse current checkout. Existing local native build generation changed ios/android scripts; keep proper native commands.
- Decision: openly licensed catalog and local imports meet no-key/no-ad playback without claiming access to Spotify's protected catalog.
- REA native search metadata is bounded static evidence. Our 250 ms debounce, ranking, history cap and persistence behavior are independent implementation choices.

## Execution result before publication

- Tasks 1–4 complete: pure model/persistence/transport tests, durable native/web import storage, new Router UI and actual expo-audio integration. Old Spotify OAuth client removed.
- Six full licensed audio assets downloaded from the composer's catalog, re-encoded to 128 kbps with explicit CC BY 4.0 credits and hashes. No Spotify assets/binaries redistributed.
- Independent review found four issues; all addressed with regressions observed failing before fixes. No deferred minors.
- Fixed P1: hydrate saved metadata before recovering blobs; isolate each blob failure and prohibit writes when metadata itself cannot load. Browser regressions verify both failure modes preserve saved data.
- Fixed P2: an imperative transport preserves volume across replacement, rewinds EOF on native, and invalidates delayed replay after a newer pause/selection. Four transport unit tests cover these cases; real-audio browser volume regression passes.
- Fixed P2: prune deleted imported IDs from the queue and skip unavailable IDs when advancing. Browser regression verifies deleting a middle queue item reaches the next playable song.
- Additional regression: internal persistence promise rejection is handled when no subsequent action follows.
- Fixed controlled seek input: optimistic thumb value prevents a delayed SDK progress sample reverting a user seek; underlying time remains driven by the audio engine. Real seek and natural queue advance pass.
- Validation: 20 Vitest model/persistence/transport tests and 12 Vitest browser tests pass; lint and TypeScript pass; web and iOS/Android JavaScript exports pass; npm audit reports zero vulnerabilities.
- Screenshots inspected at phone and desktop sizes. REA evidence exported locally and its target session closed.
- Publication remains the final step: push main, wait for CI and Pages, verify the public site plays actual MP3 without credential fields.
