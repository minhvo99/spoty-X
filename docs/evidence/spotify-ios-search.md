# Spotify iOS search: evidence and reconstruction boundaries

The user selected Spotify iOS search as the reference, replacing the accidental Apple Notes wording. This report analyzes the user-supplied IPA; it does not verify that the third-party download is an unmodified App Store build.

## Artifact identity

- IPA: `com.spotify.client_9.1.94_und3fined.ipa`.
- IPA SHA-256: `673bcf114c7617ee3cb1106023704fb2176ef4579373f25c8833b81cd2766084`.
- Supplied Info.plist declares `com.spotify.client`, version `9.1.94`, executable `Spotify`, iPhoneOS, minimum OS 16.1.
- REA archive inspection: `ev_17c89faca08f1d2c0fcbce052c6660f1a10ff4eac8afa5998900bd7e7203317d`; 783 regular files, 248 directories, no archive integrity contradictions reported.
- REA verified extraction: `ev_40abf7bc703569f96725bc3afde39230c0e680a5863bdb44d28fcbb460db5590`.
- REA Mach-O inspection: `ev_b719d4dc0aa2bc1ccbab34a9a0f173e58c693d451db2cf313780cc076ed59f64`; arm64, 64-bit little endian. Import/export inventories are non-exhaustive.
- Executable SHA-256: `542d2f56dc909eec58d5168c69fe9fed5478599be36bf6a95ac3e8133dc09b66`.

## Exact inert byte observations

These are file offsets into the executable, not virtual addresses. They can be verified against the exact hash above. Strings were located without executing the application; no Spotify credentials, account data or traffic were collected.

| File offset | Observed string |
| --- | --- |
| `0xa70baf0` | `ClearRecentSearches` |
| `0xa70c890` | `RemoveRecentSearchesItem` |
| `0xa73dbc0` | `SearchResultsViewController` |
| `0xa7acb20` | `DebouncedEntitySearchProvider` |
| `0xa7ae970` | `QueryDebounceEventSource` |
| `0xa7ce6c0` | `RecentSearchesListProvider` |
| `0xaafed60` | `SearchFilterChipsElementUI` |

## What the observations support

The names support hypotheses that this binary contains machinery for search results, filter chips, recent-search lists, clearing the full history, removing individual history items, and debounced queries. A string is not proof that its feature is reachable in this version's UI or that it executes during a particular search.

The full search implementation, backend protocol, storage schema, exact debounce duration and ranking algorithm have **not** been recovered. No UI scenario was run in the Spotify IPA. No native decompiler is configured, and the 248 MB executable exceeds REA's 64 MiB dispatch-metadata snapshot limit. These limitations are not evidence that a feature is absent.

## Independent implementation in Spoty-X

Spoty-X implements a 250 ms input debounce, title/artist/collection search, Vietnamese accent folding, exact-title/prefix/substring ranking, filter chips, ten deduplicated recent queries, individual removal and clear-history controls. These timings and algorithms are our design decisions, not claimed Spotify behavior. State persists locally and no developer/API credentials are requested.

The playable catalog is six full CC BY 4.0 recordings by Kevin MacLeod plus user-imported local audio. Search is across that library, not Spotify's remote catalog. Audio playback is implemented independently with expo-audio. No Spotify executable, assets or recovered code is distributed.

## Verification

Vitest tests exercise query normalization/ranking/filtering, history deduplication/cap/removal, queue behavior, failed/serialized persistence and import validation. Vitest browser tests use Playwright as a driver to exercise the real exported application, actual MP3 decoding and advancing media currentTime, seeking, queue advance, favorites/playlists, imported audio after reload and Pages subpath navigation.
