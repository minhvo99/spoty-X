# Spoty-X: independent React Native music player

User authorized implementation decisions, requires real music playback, no advertising, no API key entry, Vitest, and GitHub Pages deployment. This supersedes the previous Spotify OAuth-client design. Reference search target is Spotify iOS 9.1.94 from the user-provided IPA, not Apple Notes.

## Product

Build a Vietnamese Spotify-like native/web player branded Spoty-X. Start immediately with bundled full-length CC BY 4.0 music, explicit composer/source/license credits, and optional user audio-file import. No account, Spotify SDK, Client ID, Client Secret, advertising, analytics or Spotify catalog access is needed. This does not claim to provide Spotify's complete catalog or Premium subscription features.

Home presents playable editorial collections and actual available tracks. Search covers title, artist, and collection; normalizes accents/case/spacing; shows ranked results, entity filters and bounded recent-search history that can be removed individually or cleared. Library stores favorites, custom playlists and imported audio. Full player supports actual play/pause/previous/next, seek, shuffle, repeat and queue. Progress and duration come from the audio engine, never a simulated timer.

Persist playlists/favorites/recent searches and imported files. Web stores imported audio in IndexedDB as blobs, not disposable object URLs; native copies imports into the documents directory. Imports are local and are not uploaded. Handle unavailable storage/unsupported media without falsely reporting success. Limit oversized imports with an actionable error.

Use React Native, Expo SDK 58, Expo Router, expo-audio and a small shared typed state/search core. Use Expo Router query parameters on the root route so GitHub Pages refreshes always hit the existing root page. Keep web and native storage adapters separate. No recording/microphone permissions. Support mobile and desktop layouts, keyboard focus, readable errors and usable touch targets.

## Evidence boundaries

IPA SHA-256: 673bcf114c7617ee3cb1106023704fb2176ef4579373f25c8833b81cd2766084.
REA archive evidence ev_17c89faca08f1d2c0fcbce052c6660f1a10ff4eac8afa5998900bd7e7203317d; native Mach-O ev_b719d4dc0aa2bc1ccbab34a9a0f173e58c693d451db2cf313780cc076ed59f64. Inert binary strings include SearchFilterChipsElementUI, ClearRecentSearches, RemoveRecentSearchesItem, SearchResultsViewController, DebouncedEntitySearchProvider. These support design hypotheses, not proof of runtime behavior. The 248 MB binary exceeds REA's 64 MiB dispatch-metadata limit, and no decompiler is configured. Record exact string offsets and do not invent an observed debounce interval, sorting algorithm or network protocol. Implement our own documented choices, with tests.

Do not redistribute the IPA, Spotify executable, assets or recovered source. Keep binary inputs and extraction/reports ignored. Publish only original implementation and a small evidence summary with hashes/offsets.

## Validation and delivery

Vitest unit tests for search ranking/normalization/filtering, history deduplication/removal/cap, queue/repeat/shuffle, persisted-state validation and playlist operations. Vitest browser tests with Playwright driver must play actual bundled audio and verify advancing audio-engine currentTime; exercise pause/seek/next, search/history/filters, persistence, import/playback, and mobile layout. Run lint, TypeScript, web export, native JS export, dependency audit and independent review. Update CI, README and credits; push only source/licensed audio, deploy Pages and verify the public mobile site.

iOS signed install remains dependent on the user's Xcode Apple account being reauthenticated and a provisioning profile; do not claim device installation until it succeeds.
