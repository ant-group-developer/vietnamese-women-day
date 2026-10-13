# 🌸 Website chào mừng ngày 20/10 – Hành trình thu thập hoa

Website 3D vui nhộn: chú mèo nhỏ dẫn người xem đi qua từng phòng ban trên một hòn đảo nổi, mỗi trạm giới thiệu các chị em của phòng ban đó. Thu đủ hoa thì mở hộp quà và phát video.

- Bấm vào bất kỳ ngôi nhà nào (không cần theo thứ tự), mèo sẽ chạy tới đó và mở thiệp giới thiệu phòng ban.
- Kéo chuột/ngón tay để xoay bản đồ, cuộn chuột hoặc chụm hai ngón để zoom. Nút 🎯 đưa camera về sau nhân vật.
- Nút "Đi tiếp" gợi ý phòng ban chưa thăm gần nhất. Thăm đủ mọi phòng thì hộp quà mở khoá.
- Cụm nút góc phải dưới: phóng to, thu nhỏ, xoay trái/phải, về nhân vật, mở lại hướng dẫn. Hướng dẫn hiện lần đầu vào; tích "Không hiển thị lại" thì lưu trong localStorage của trình duyệt.
- Trong thiệp phòng ban, bấm vào ảnh để xem lớn. Video quà giữ nguyên tỉ lệ gốc (ngang hay dọc đều không bị cắt).

## Chạy thử

```bash
npm install
npm run dev
```

Mở địa chỉ hiện trên terminal (thường là http://localhost:5173).

## Điền dữ liệu thật

### 1. Phòng ban và thành viên

Sửa file `src/data/departments.json`. Mỗi phòng ban gồm:

| Trường | Ý nghĩa |
|---|---|
| `slug` | Tên không dấu, dùng làm tên thư mục ảnh (vd: `ke-toan`) |
| `name` | Tên hiển thị |
| `color` | Màu ngôi nhà (mã hex) |
| `icon` | Emoji đại diện |
| `message` | Lời chúc/giới thiệu ngắn |
| `members` | Danh sách `{ name, title, photo }` |

Số lượng phòng ban tuỳ ý, bản đồ tự dài ra theo số trạm.

### 2. Ảnh

**Cách nhanh (khuyên dùng):** gom ảnh vào một thư mục, mỗi thư mục con là một phòng ban, mỗi file ảnh đặt tên theo tên người (jpg/png/heic đều được), rồi chạy:

```bash
python scripts/import-photos.py raw-photos
```

Script sẽ resize ảnh về tối đa 800px, chuyển sang JPG vào `public/images/<slug>/` và sinh lại `src/data/departments.json` (tên phòng ban, màu, icon, lời chúc lấy từ bảng `DEPT_META` trong script). Cần cài `pip install pillow pillow-heif` một lần. Thư mục `raw-photos/` hiện chứa ảnh gốc và không được deploy.

**Cách thủ công:**

Đặt ảnh vào `public/images/<slug>/` và ghi đúng đường dẫn trong trường `photo` (vd: `/images/ke-toan/huong.jpg`). Ảnh vuông sẽ đẹp nhất. Nếu ảnh thiếu, web tự hiện avatar chữ cái đầu nên không bị lỗi.

Dữ liệu mẫu đang dùng ảnh placeholder `.svg`. Để sinh lại placeholder cho thành viên mới có đường dẫn `.svg`:

```bash
npm run placeholders
```

### 3. Video quà

Đặt file vào `public/video/gift.mp4`. Nếu muốn dùng YouTube, mở `src/config.ts` và đổi:

```ts
video: { type: 'youtube', src: 'https://www.youtube.com/watch?v=XXXX' }
```

### 4. Nhạc nền và hiệu ứng (tuỳ chọn)

Đặt vào `public/audio/`:

- `bgm.mp3` – nhạc nền (lặp)
- `step.mp3` – tiếng bước chân
- `pop.mp3` – tiếng nhận hoa
- `gift.mp3` – tiếng mở quà

Thiếu file nào thì web bỏ qua file đó, không báo lỗi.

### 5. Tiêu đề, tên công ty, lời chúc cuối

Tất cả nằm trong `src/config.ts`.

## Build và deploy

```bash
npm run build
```

Thư mục `dist/` là website tĩnh, đưa lên Vercel, Netlify, GitHub Pages hoặc bất kỳ web server nào. Nếu deploy vào thư mục con (vd: `https://ten-mien.com/20-10/`), thêm `base: '/20-10/'` vào `vite.config.ts`.

Xem thử bản build:

```bash
npm run preview
```

## Cấu trúc

```
src/
  config.ts              cấu hình chung
  data/departments.json  dữ liệu phòng ban
  store/useJourney.ts    trạng thái hành trình
  scene/                 các thành phần 3D (đảo, đường, trạm, mèo, hộp quà, camera)
  ui/                    intro, HUD, popup phòng ban, video, outro, cánh hoa rơi
  audio/sound.ts         âm thanh
```
