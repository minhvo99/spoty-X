# Spoty-X native and web

Independent no-key music player; see the [root README](../README.md) for setup, music credits, CI/CD and evidence boundaries.

- `src/music/model.ts`: pure library/search/queue behavior, tested with Vitest.
- `src/music/persistence.ts`: serialized durable state and import validation.
- `src/music/transport.ts`: guarded transport commands, volume and EOF replay.
- `src/music/storage.web.ts`: localStorage metadata and IndexedDB audio blobs.
- `src/music/storage.ts`: AsyncStorage and copied document audio on native.
- `src/music/provider.tsx`: actual expo-audio lifecycle and application state.
- `src/app/`: Expo Router root route and layout.
- `src/screens/`, `src/components/`: responsive original UI.
- `tests/`: Vitest browser tests driven by Playwright against actual exported audio.

No API key, environment file or account is needed. Imported audio remains local. Source audio attribution is in `assets/audio/ATTRIBUTION.md`.
