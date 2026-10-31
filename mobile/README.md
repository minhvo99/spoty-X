# Spoty-X mobile / web

React Native + Expo. Xem [README gốc](../README.md) để cấu hình Spotify và GitHub Pages.

```bash
npm ci
npm run web
npm test
npm run typecheck
npm run build:web
npx playwright install chromium
npm run test:e2e
npm run build:native:check
```

`src/spotify/core.ts` chứa OAuth/API không phụ thuộc giao diện. Các file `.web.ts` dành cho sessionStorage, callback web và Spotify Web Playback SDK; file tương ứng không có hậu tố dùng SecureStore và trình duyệt hệ thống trên native. `src/app.tsx` dùng React Native cho cả ba nền tảng.

Test Vitest bao gồm unit test trong `src/spotify` và test trình duyệt trong `tests`; test trình duyệt cần export `dist/` trước. Không commit `.env`, token, khóa hoặc output build/test.
