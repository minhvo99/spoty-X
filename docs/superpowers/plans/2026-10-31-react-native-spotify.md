# Spoty-X Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. User delegated implementation choices and authorized push/deploy.

**Goal:** React Native Spotify client with a working GitHub Pages web build.
**Architecture:** Expo TypeScript single-screen shell with local tabs, shared Spotify API/OAuth core, platform-specific storage/auth and playback adapters. Static export at `/spoty-X/` with callback at root.
**Tech Stack:** Expo, React Native Web, TypeScript, Spotify PKCE/Web Playback SDK, Vitest (explicit user requirement), GitHub Actions.
**Spec:** `docs/superpowers/specs/2026-10-31-react-native-spotify-design.md`

## Global Constraints

- No advertising SDK, analytics, client patching, downloaded Spotify audio or simulated Premium access.
- Public Client ID only; no Client Secret. Session tokens on web; secure storage on native.
- Web streams through Spotify SDK with Premium; native controls an existing Spotify device.
- Origin only; no force push. Keep legacy source outside deployed bundle.

## Review Focus

- OAuth state mismatch/replayed callback must never create a session.
- Concurrent expired requests must share refresh; logout must prevent stale refresh resurrecting session.
- HTTP 403/429, no device and absent Client ID must show actionable feedback.
- Search/playlist requests arriving out of order must not replace current view data.
- Static asset URLs and OAuth callback must work beneath `/spoty-X/`.

### Task 1: OAuth and API core with scaffold

**Files:** `mobile/package.json`, `mobile/app.json`, `mobile/src/spotify/{core.ts,core.test.ts,storage.ts,storage.web.ts,auth.ts,auth.web.ts,types.ts}`.
**Interfaces:** `SpotifyClient(storage, fetcher)` exposes `request<T>(path, init?)`, `acceptCallback(params, redirectUri)`, `loginUrl(clientId, redirectUri)`, `logout()`, `token()`; async storage get/set/remove.

- [ ] Scaffold `create-expo-app` blank TypeScript; configure web base URL and native identity.
- [ ] Write/run failing tests for PKCE RFC vector, state mismatch/replay, refresh preservation/single flight, 401 retry and 429 cooldown.
- [ ] Implement core and adapters; run full tests and typecheck.
- [ ] Commit tested core.

### Task 2: Responsive client and playback

**Files:** `mobile/src/{app.tsx,theme.ts}`, `mobile/src/components/*`, `mobile/src/spotify/{playback.ts,playback.web.ts,use-spotify.ts}` and `mobile/App.tsx`.
**Interfaces:** Shared typed tracks/playlists/player state; platform player connect/disconnect, Web SDK supplies device ID; UI calls core requests and real player state.

- [ ] Create shared navigation state and onboarding configuration with public Client ID; test empty, error and connected flows in browser using isolated network fixtures.
- [ ] Implement library pagination, playlist items pagination, search, track playback and device selection.
- [ ] Implement native active-device control and web SDK lifecycle/cleanup, real progress, keyboard accessible controls.
- [ ] Typecheck, run suite, export web and native JS bundles; inspect desktop/mobile screenshots.
- [ ] Commit application.

### Task 3: Publication and documentation

**Files:** `.github/workflows/pages.yml`, `README.md`, `mobile/README.md`, `.gitignore`.

- [ ] Disable legacy automation for this fork; add npm CI/test/typecheck/export and official Pages deployment workflow.
- [ ] Document setup, redirect URI, Premium restrictions, testing limits and deployment.
- [ ] Fresh independent whole-change review; resolve important findings with regression tests.
- [ ] Run final checks, commit, push origin, enable Pages Actions and verify completed deployment/public URL.
- [ ] Report URL plus outstanding account/Client ID verification honestly.

## Visual direction

Palette: canvas #080a09, panels #121613, raised #202721, text #f2f5ed, muted #9ca89e, Spotify green #1ed760. System sans, large condensed-feeling heavy headings, clear numeric progress. Desktop library sidebar / main playlist area / fixed bottom player; compact bottom tabs on phone. A large record illustration anchors the disconnected screen; no fake albums or fictitious playback.

## Execution ledger

- Initial: clean checkout before design documents; existing branch main, dedicated user target empty.
- Ruling: reuse current checkout as user authorized all repo work; create codex implementation branch, publish main to empty target after verification.
- Ruling: blank TypeScript Expo shell with local tabs avoids unnecessary router deep links on Pages; actual Spotify callback remains at root.
