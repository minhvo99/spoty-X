# Spoty-X: ứng dụng React Native kết nối Spotify

Trạng thái: triển khai theo ủy quyền toàn quyền trong repo của người dùng ngày 2026-10-31. Builder check: không còn câu hỏi quan trọng.

## Yêu cầu đã xác nhận

- Viết lại bằng React Native, trải nghiệm nghe nhạc giống Spotify, không có quảng cáo của ứng dụng.
- Nguồn nhạc: tài khoản Spotify của người dùng.
- Push mã tới https://github.com/minhvo99/spoty-X.git và deploy bản web lên GitHub Pages.
- Repo hiện tại là bộ vá Spotify Windows bằng PowerShell, không phải mã nguồn trình phát Spotify.
- Origin đã trỏ tới repo đích; repo SpotX gốc được giữ dưới remote upstream.

## Phương án đề xuất của người triển khai

- Tạo ứng dụng mới trong `mobile/`, dùng React Native, TypeScript và Expo, có khả năng xuất web tĩnh.
- Không chạy hoặc đưa các script vá, tài nguyên vá, quy tắc chặn quảng cáo của SpotX vào ứng dụng mới hoặc website deploy. Giữ chúng trong lịch sử và thư mục gốc để tránh xóa dữ liệu chưa được yêu cầu cụ thể.
- Giao diện tiếng Việt, nền tối, điểm nhấn xanh, responsive cho điện thoại và desktop; đặt tên Spoty-X, không tự nhận là ứng dụng Spotify chính thức.
- Các màn hình chính: kết nối tài khoản, thư viện playlist, chi tiết playlist, tìm kiếm bài hát và trình phát đang nghe.
- Không đưa quảng cáo, SDK quảng cáo hoặc analytics vào ứng dụng mới.

## Đăng nhập và cấu hình

- Dùng OAuth Authorization Code with PKCE và state ngẫu nhiên; không cần Client Secret hay backend cho Pages.
- Cấu hình Client ID qua biến môi trường công khai và màn hình thiết lập khi chưa có cấu hình build. Client ID không phải bí mật. Không yêu cầu người dùng nhập mật khẩu Spotify vào ứng dụng.
- Bản web dùng redirect URI chính xác `https://minhvo99.github.io/spoty-X/`; xử lý callback tại trang gốc, tránh lỗi deep link 404 của Pages.
- Đăng nhập native dùng trình duyệt hệ thống và redirect tương thích với ứng dụng đã build. Expo Go không phải tiêu chí nghiệm thu OAuth native. Đăng ký redirect URI theo quy định Spotify hiện hành trước khi nghiệm thu native.
- Lưu token web theo phiên; native dùng secure storage. Tự refresh token, gộp yêu cầu refresh đồng thời và xóa phiên khi đăng xuất.
- Người dùng cần tạo ứng dụng Spotify Developer, cung cấp Client ID, đăng ký redirect URI và thêm tài khoản thử nghiệm vào allowlist nếu đang ở Development Mode.
- Nếu chưa có Client ID, website vẫn build và deploy được nhưng hiển thị thiết lập, không giả vờ đã kết nối hoặc đã phát nhạc.

## Dữ liệu và phát nhạc

- Đọc thông tin tài khoản, danh sách playlist của chính người dùng, nội dung playlist được API cho phép và kết quả tìm kiếm.
- Kiểm tra các thay đổi Development Mode năm 2026 trước khi chọn endpoint, trường dữ liệu và scopes; chỉ dùng tính năng API hiện hành hỗ trợ.
- Bản web dùng Spotify Web Playback SDK để phát nhạc trên trình duyệt, tạo thiết bị Spotify Connect và chuyển phát theo hành động của người dùng.
- Native dùng Web API để điều khiển thiết bị Spotify đang hoạt động; không hứa phát trực tiếp âm thanh trong React Native. Khi không có thiết bị, hướng dẫn mở Spotify và tải lại danh sách thiết bị.
- Điều khiển: phát/tạm dừng, bài trước/sau, tua, shuffle và repeat khi tài khoản/API cho phép. Hiển thị trạng thái thật từ SDK hoặc API; không dùng timer giả lập phát nhạc.
- Hiển thị trạng thái tải, danh sách trống, mất kết nối, token hết hạn, API 403/429 và trình duyệt không hỗ trợ phát nhạc. Tôn trọng Retry-After khi bị giới hạn.
- Không thay đổi nội dung âm thanh Spotify, không tải nhạc Spotify offline, không mô phỏng quyền Premium, không lọc quảng cáo trong luồng Spotify.

## Giới hạn cần biết

- Web Playback SDK yêu cầu tài khoản Spotify Premium. Ứng dụng không biến Spotify Free thành Premium.
- Theo tài liệu hiện hành, chủ ứng dụng Development Mode phải có Premium; ứng dụng mới giới hạn 5 người dùng được cho phép.
- Không có quảng cáo riêng của Spoty-X; nội dung và quyền phát của Spotify do Spotify quyết định.
- Cần tài khoản Spotify và Client ID thực để kiểm thử đăng nhập và phát nhạc đầu cuối. Không tự đăng nhập thay người dùng.

## GitHub và nghiệm thu

- Thêm workflow GitHub Actions build web tĩnh, cấu hình đường dẫn `/spoty-X/`, rồi deploy bằng GitHub Pages chính thức với quyền tối thiểu.
- Giữ các workflow cũ không cần thiết khỏi luồng triển khai mới; không chạy script tải hoặc vá Spotify Windows.
- Chỉ push tới origin của người dùng; không push upstream, không force push. Người dùng đã cho phép push và deploy khi hoàn tất.
- Cập nhật README gốc để chỉ rõ ứng dụng mới, cách chạy native/web, cấu hình Spotify, quyền Premium và cách deploy.
- Kiểm tra typecheck, các test có ý nghĩa cho OAuth/refresh và xử lý lỗi API, export web, giao diện trình duyệt và workflow deploy thực tế.
- Sau deploy, kiểm tra URL công khai và báo riêng các phần đã kiểm chứng với các phần còn chờ Spotify Client ID/tài khoản thực.

## Tài liệu tham chiếu

- https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
- https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started
- https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide

Các lựa chọn thư viện, cấu trúc component, bố cục chi tiết, lưu bộ nhớ đệm và cách tổ chức test được giao cho người triển khai, miễn thỏa các hành vi và giới hạn trên.
