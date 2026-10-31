# Spoty-X

Ứng dụng **React Native + Expo + TypeScript** kết nối tài khoản Spotify, có giao diện tiếng Việt cho điện thoại và web. Không tích hợp quảng cáo, SDK quảng cáo hoặc analytics riêng.

**Website:** https://minhvo99.github.io/spoty-X/

## Những gì ứng dụng làm được

- Đăng nhập Spotify qua OAuth Authorization Code + PKCE, không dùng Client Secret.
- Đọc và phân trang playlist, xem bài hát theo định dạng Spotify API năm 2026.
- Tìm bài hát theo tên/nghệ sĩ, phát, tạm dừng, chuyển bài, tua 15 giây, shuffle và repeat khi Spotify cho phép.
- Web dùng Spotify Web Playback SDK. Bản native điều khiển thiết bị Spotify đang hoạt động qua Web API.
- Có trạng thái tải, danh sách trống, thử lại khi lỗi, xử lý refresh token và giới hạn yêu cầu API.

**Yêu cầu Premium:** phát nhạc trong trình duyệt cần Spotify Premium. Chủ ứng dụng ở Development Mode cũng cần Premium; ứng dụng mới giới hạn 5 người dùng trong allowlist. Spoty-X không cấp quyền Premium cho tài khoản Free và không sửa đổi luồng âm thanh của Spotify. Nội dung playlist trong Development Mode chỉ đọc được khi bạn sở hữu hoặc cộng tác.

## Kiểm tra bằng điện thoại

1. Mở [website](https://minhvo99.github.io/spoty-X/) bằng Chrome/Safari mới nhất.
2. Vào **Tài khoản**. Nếu chưa có Client ID cấu hình sẵn, nhập **Client ID công khai** của ứng dụng Spotify Developer của bạn.
3. Trong [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), bật Web Playback SDK/Web API, đăng ký chính xác Redirect URI:

   ```text
   https://minhvo99.github.io/spoty-X/
   ```

4. Thêm tài khoản Spotify của bạn vào User Management nếu ứng dụng đang ở Development Mode.
5. Nhấn **Đăng nhập Spotify**, cấp quyền, mở playlist và nhấn bài hát. Trình duyệt điện thoại cần thao tác nhấn để cho phép âm thanh.
6. Nếu trình duyệt không hỗ trợ DRM hoặc chưa có thiết bị, mở Spotify, phát một bài rồi chọn **Thiết bị** trong Spoty-X.

Website deploy được khi chưa có Client ID, nhưng đăng nhập/phát nhạc thực tế cần hoàn thành cấu hình trên. Không nhập Client Secret hoặc mật khẩu vào Spoty-X.

## Chạy mã nguồn

Yêu cầu Node.js 24 và npm.

```bash
npm --prefix mobile ci
npm run web
```

Expo CLI cung cấp URL phát triển. Khi test OAuth web cục bộ, dùng IP loopback `127.0.0.1` thay `localhost`, và đăng ký đúng Redirect URI đang hiển thị trong màn hình Tài khoản, gồm cả port/path.

```bash
npm start
# Hoặc trong mobile/:
npm run android
npm run ios
```

Giao diện native có thể xem qua Expo. **OAuth native cần development/production build** với scheme `spotyx://callback` đã đăng ký tại Spotify; Expo Go không phải môi trường nghiệm thu OAuth. Repo chưa cung cấp APK/IPA hoặc cấu hình ký ứng dụng. Bản native không chứa Spotify audio SDK: âm thanh được phát trên thiết bị Spotify đã chọn.

## Kiểm thử

Tất cả test được chạy bằng **Vitest**. Test trình duyệt dùng Playwright làm driver bên trong Vitest.

```bash
npm test
npm run typecheck
npm run build:web
npm --prefix mobile exec -- playwright install chromium
npm --prefix mobile run test:e2e
npm --prefix mobile run build:native:check
```

Test trình duyệt kiểm tra bản export thật tại đường dẫn `/spoty-X/`, trên desktop và viewport điện thoại; API/SDK Spotify được thay bằng fixture test. Chúng không xác nhận đăng nhập hay nghe nhạc với tài khoản Spotify thực. Screenshot trong `mobile/test-results/` không được commit.

## CI/CD và cấu hình

Workflow [CI and GitHub Pages](.github/workflows/pages.yml):

- PR tới `main`: npm ci, TypeScript, Vitest, export web, test trình duyệt và kiểm tra bundle iOS/Android.
- Push `main` hoặc chạy thủ công: kiểm tra tương tự rồi deploy artifact web đã xác minh lên GitHub Pages.
- Pull request không có quyền deploy. Deploy job chỉ có `pages: write` và `id-token: write`; build job chỉ đọc repo.
- Pages cần chọn **GitHub Actions** làm nguồn triển khai.

Cấu hình Client ID mặc định tại **Settings → Secrets and variables → Actions → Repository secrets**:

| Tên | Nội dung | Bắt buộc |
| --- | --- | --- |
| `SPOTIFY_CLIENT_ID` | Client ID của ứng dụng Spotify Developer | Không; có thể nhập trong giao diện |

Workflow đưa mã công khai này vào `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` khi build web. **Client ID vẫn công khai trong website dù được quản lý bằng GitHub Secret.** Không cấu hình Client Secret, access token hoặc refresh token trong biến `EXPO_PUBLIC_*`.

Nếu đã có Client ID trong tệp cục bộ, có thể lưu vào GitHub mà không đưa giá trị vào lệnh hoặc Git:

```bash
gh secret set SPOTIFY_CLIENT_ID --repo minhvo99/spoty-X < /path/to/local-client-id.txt
gh workflow run pages.yml --repo minhvo99/spoty-X --ref main
```

Không có khóa Spotify thật nào được cung cấp cùng mã nguồn. `.env`, chứng thư, khóa ký và file credentials được bỏ qua bởi Git. Token web chỉ lưu trong sessionStorage của tab; native dùng Expo SecureStore. Đăng xuất xóa phiên. Đóng tab web cũng kết thúc phiên lưu trữ.

## Mã nguồn SpotX cũ

Repository xuất phát từ SpotX-Official/SpotX (PowerShell vá Spotify Windows). Các script/tài nguyên cũ vẫn được giữ để bảo toàn nguồn và giấy phép; chúng **không được import, chạy hoặc deploy** cùng ứng dụng React Native. Các workflow cũ được chuyển sang `docs/legacy-workflows/` để không tự thực thi. Không chạy các file `.bat`/`run.ps1` để cài ứng dụng mới.

Ứng dụng mới nằm hoàn toàn trong `mobile/`. Giấy phép nguồn gốc được giữ trong `LICENSE`; license của template Expo nằm trong `mobile/LICENSE`.

Tài liệu tham khảo: [PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow), [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started), [thay đổi API năm 2026](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).
