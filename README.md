# Spoty-X

**React Native + Expo** music player with a Vietnamese, Spotify-like interface. Open and listen: no account, API key, ads or analytics.

**[Open Spoty-X on your phone](https://minhvo99.github.io/spoty-X/)**

The catalog contains **six full-length CC BY 4.0 recordings by Kevin MacLeod**, plus audio you import from your device. It does not provide Spotify's remote catalog, change a Spotify subscription or play protected Spotify streams. Earlier OAuth/Client ID screens and the Spotify SDK have been removed.

## Features

- Actual audio playback through `expo-audio`: pause/resume, previous/next, seek, shuffle, repeat one/all and queue advance.
- Search titles, artists and collections, including Vietnamese accent-insensitive matching, ranked results and filter chips.
- Recent searches, individual removal and clear-history controls.
- Favorites and custom playlists, stored locally.
- Import MP3/M4A/AAC/WAV/FLAC/OGG/OPUS files. Playback support varies by device/browser. Maximum 25 MB per file and 10 files per import.
- Imported audio survives reload: IndexedDB blobs on web, copied document files on native. Files are not uploaded. Clearing site data removes the local library.
- Original responsive UI for phones and desktop, with Expo Router navigation through root query parameters so Pages refresh works.

On iPhone Safari, use the physical device buttons for volume; iOS browsers do not permit programmatic volume control. Native builds support background audio and OS media controls. No microphone/recording permission is requested.

## Run and test

Node.js 24 and npm are required.

```bash
npm --prefix mobile ci
npm run web
```

```bash
npm test
npm run lint
npm run typecheck
npm run build:web
cd mobile
npx playwright install chromium
npm run test:e2e
npm run build:native:check
```

All tests use **Vitest**. Browser tests use Playwright as the driver and the actual exported site at `/spoty-X/`. They decode real bundled MP3s and verify advancing `HTMLAudioElement.currentTime`, pause/seek/queue behavior, search, playlists, storage failures, retained volume and imported audio after reload. The player is not simulated.

## Native build

```bash
cd mobile
npx expo prebuild --platform ios
npm run ios:device
# Android with an SDK/device configured:
npm run android
```

Generated native projects, signing files and build products stay out of Git. Real iPhone installation needs an authenticated Apple account in Xcode, a provisioning profile and a trusted device with Developer Mode enabled. The earlier device attempt was blocked by Xcode account authentication/provisioning; a successful JavaScript export alone does not establish a device installation.

## CI/CD

[CI and GitHub Pages](.github/workflows/pages.yml) installs locked dependencies, runs lint, TypeScript, Vitest, web export, real-audio browser tests and iOS/Android JavaScript exports. Only a verified `main` build can deploy using GitHub Pages Actions. Pull requests run checks without deployment permissions.

**There are no required environment variables, GitHub Secrets, Spotify Client IDs or API keys.** Never commit private credentials, `.env`, signing keys or tokens. IPA/DMG/APP inputs and analysis extractions are ignored and excluded from the deployed artifact.

## Music attribution

Carefree, Dream Culture, Cipher, Sneaky Snitch, Local Forecast - Elevator, Night on the Docks - Sax by **Kevin MacLeod (incompetech.com)**. Licensed under **Creative Commons: By Attribution 4.0**, https://creativecommons.org/licenses/by/4.0/. Audio re-encoded to 128 kbps MP3; no timing edits.

Full source URLs, ISRCs and file hashes: [audio attribution](mobile/assets/audio/ATTRIBUTION.md). Credits are also accessible inside the application. Source licensing: https://incompetech.com/music/royalty-free/licenses/.

## Evidence and implementation scope

[Spotify iOS search evidence](docs/evidence/spotify-ios-search.md) contains exact artifact hashes, REA Evidence IDs, byte offsets and interpretation limits. The supplied IPA provides static search-related strings; it was not executed and the complete search algorithm/backend was not recovered. Our debounce, ranking and history policy are independent implementation decisions. No Spotify executable, recovered source, IPA assets or artwork is redistributed.

Original product implementation is in `mobile/src/`. The root PowerShell/patch resources are historical SpotX Windows source and are not executed or deployed with this player. Previous Windows automation is archived under `docs/legacy-workflows/`. Source licenses remain in `LICENSE` and `mobile/LICENSE`.
