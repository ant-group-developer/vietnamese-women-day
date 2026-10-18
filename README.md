# 🌸 Website chào mừng ngày 20/10 – Hành trình thu thập hoa

Website 3D vui nhộn: một bạn đồng hành nhỏ dẫn người xem đi qua từng phòng ban trên một hòn đảo nổi, mỗi trạm giới thiệu các chị em của phòng ban đó. Thu đủ hoa thì mở hộp quà và phát video.

- Bấm vào bất kỳ ngôi nhà nào (không cần theo thứ tự), nhân vật sẽ chạy tới đó và mở thiệp giới thiệu phòng ban.
- Kéo chuột/ngón tay để xoay bản đồ, cuộn chuột hoặc chụm hai ngón để zoom. Nút 🎯 đưa camera về sau nhân vật.
- Nút "Đi tiếp" gợi ý phòng ban chưa thăm gần nhất. Thăm đủ mọi phòng thì hộp quà mở khoá.
- Quà bất ngờ giữa đường: khi có đủ số bông hoa cấu hình ở /admin (mặc định 4), một hộp quà treo chùm bóng bay rơi xuống cạnh nhân vật. Bấm vào thì bóng bay bay đi, hộp mở và phát video bất ngờ; sau đó xem lại ở nút 🎬 trên thanh trên cùng (hoặc nút "Video bất ngờ" ở màn kết thúc). Chưa có video bất ngờ thì quà không xuất hiện.
- Bản đồ là một vòng elip lớn, đi một chiều là quay về chỗ cũ: cung phía trước là đường chính trên đảo chính (nhà phía trong vòng, quảng trường có đài phun nước, vườn hoa, chợ hoa, hồ sen phía trước), phần còn lại đi qua 5 đảo phụ nằm trên vòng (Cối Xay Gió, Sở Thú Thảo Nguyên, Nhiệt Đới, Sở Thú Bắc Cực, Hoa Anh Đào), nối bằng cầu treo chạy theo cung vòng (`src/scene/path.ts`, `landmarks.ts`, `route.ts`). Giữ ← → hoặc A D (trên điện thoại/máy tính bảng: giữ nút ◀ ▶ mờ ở góc dưới) là đi tới/lùi dọc vòng, không phụ thuộc góc xoay camera; bấm vào một đảo phụ hoặc tên đảo để đi thẳng tới đó; tốc độ đi chỉnh ở nút 🐾 (0,5× – 2×, lưu trong trình duyệt).
- Thú đi dạo, mỗi đảo một nhóm cùng loài hoặc cùng môi trường sống (`ISLAND_ANIMALS`, `ZOO_PENS`, `MAIN_ANIMALS` trong `landmarks.ts`): cừu ở Cối Xay Gió, vẹt, chim ruồi, chuột lang nước ở Nhiệt Đới, cáo, sói, nai ở Hoa Anh Đào, hươu cao cổ, voi (chuồng lớn) và sư tử (chuồng riêng) ở Thảo Nguyên, gấu Bắc Cực, hải mã (chuồng lớn) và hải cẩu bơi trong hồ (chuồng nhỏ) ở Bắc Cực, rái cá và kỳ giông, gấu trúc đỏ và gấu mèo ở hai bên đảo chính. Thú chia ra hai phía đường (hai bãi hoặc hai chuồng), giữ khoảng cách và né nhau, né cả bạn đồng hành. Điện thoại mỗi nhóm tối đa 2 con.
- Cụm nút góc phải dưới: phóng to, thu nhỏ, xoay trái/phải, về nhân vật, mở lại hướng dẫn. Hướng dẫn hiện lần đầu vào; tích "Không hiển thị lại" thì lưu trong localStorage của trình duyệt.
- Khi vào web sẽ chọn nhân vật dẫn đường (18 con, mặc định Gấu Mèo), lựa chọn lưu trong localStorage; tích "Không hiển thị lại lần sau" thì các lần sau bỏ qua màn chọn. Đổi nhân vật ở nút 🐾, chỉnh âm lượng ở nút loa. Nhân vật là model GLB có animation:
  - Bộ Cozy Animals của Gamideo (`assets/Gamideo_cozy_animals`), texture đã thu về 1024px cho nhẹ, đặt trong `public/models/cozy`; ảnh thẻ chọn cắt từ `preview.png` của bộ, đặt trong `public/images/characters`. Rùa, hải cẩu chỉ có animation bơi; vẹt, chim ruồi bay lơ lửng.
  - Thêm nhân vật mới: bỏ GLB vào `public/models` và khai báo trong `src/scene/characters.tsx` (tên clip đứng yên/di chuyển/chào, tỉ lệ, tốc độ bước).
- Cảnh vật dùng model CC0 trong `public/models/env` (khai báo ở `src/scene/envAssets.ts`): cây, bụi, hoa, nấm, đá từ Kenney Nature Kit; nhà lắp từ mảnh tường/mái của Kenney Fantasy Town Kit (màu mái và tường lấy theo màu phòng ban); hộp quà từ Kenney Holiday Kit (nắp tách rời để mở); mây của Quaternius (poly.pizza). Gói gốc tải về nằm trong `assets/kenney` (không commit).
- Trong thiệp phòng ban, bấm vào ảnh để xem lớn. Video quà giữ nguyên tỉ lệ gốc (ngang hay dọc đều không bị cắt).

## Chạy thử

```bash
npm install
npm run dev
```

Mở địa chỉ hiện trên terminal (mặc định http://localhost:5280).

## Trang cấu hình /admin

Phòng ban, nhân viên (kèm ảnh), danh sách nhạc nền và video quà được chỉnh ở **`/admin`** (vd: `https://ten-mien.vercel.app/admin`), lưu trên Vercel Blob. Bấm **Lưu** là trang chính cập nhật sau khoảng 1–3 phút (do CDN cache), không cần deploy lại. Trang chính đọc thẳng file `config/site.json` trên Blob nên lượt xem không tốn lượt `list` (Advanced Operations) của Blob; mỗi lần lưu vẫn giữ bản sao `config/site-<thời gian>.json` (10 bản gần nhất) để khôi phục.

### Cài đặt một lần trên Vercel

1. Project → **Storage** → Create **Blob** store (chọn *Public*) → Connect vào project. Vercel tự thêm biến `BLOB_READ_WRITE_TOKEN`.
2. **Settings → Environment Variables** → thêm `ADMIN_PASSWORD` (mật khẩu vào trang admin).
3. Redeploy.

Chưa làm các bước trên thì trang chính vẫn chạy bằng dữ liệu mặc định trong `src/data/departments.json`.

### Chạy /admin ở máy

```bash
vercel env pull .env.local
npm run dev
```

Rồi mở http://localhost:5280/admin. `npm run dev` tự chạy các API trong `api/` bằng biến trong `.env.local` (xem `.env.example`).

### Ghi chú

- Ảnh nhân viên được thu nhỏ về tối đa 800px và chuyển sang WebP ngay trên trình duyệt trước khi upload. Nút **Thêm nhiều từ ảnh** lấy tên file làm tên người.
- Nhạc nền phát lần lượt theo danh sách, hết bài cuối thì quay lại đầu (có tuỳ chọn xáo bài).
- Video quà và video bất ngờ: upload mp4 hoặc dán link YouTube (cùng ở tab Video).
- Mỗi lần lưu tạo một file `config/site-<thời gian>.json` trên Blob, giữ lại 10 bản gần nhất.

## Dữ liệu mặc định (khi chưa lưu gì trên /admin)

- Phòng ban: `src/data/departments.json` (có thể sinh bằng `python scripts/import-photos.py raw-photos`, ảnh nằm ở `public/images/<slug>/`).
- Tối ưu ảnh nhân viên: `python scripts/optimize-photos.py` chuyển mọi ảnh trong `departments.json` (kể cả ảnh đang nằm trên Vercel Blob) thành `<ten>.webp` (800px) + `<ten>.thumb.webp` (320px, cho ô ảnh trong thiệp) trong `public/images/<slug>/`. Thêm `--from https://<ten-mien>/api/config` để lấy danh sách đang lưu trên Vercel làm gốc. Chạy lại sau mỗi lần import ảnh mới.
- Nhạc nền: bài "Carefree" trên R2 (khai báo trong `src/data/siteData.ts`). Video quà và 2 video bất ngờ (mốc 2 và 5 bông hoa) là link YouTube, cũng khai báo trong `src/data/siteData.ts`.
- Hiệu ứng âm thanh (luôn lấy từ `public/audio/`): `step.mp3`, `pop.mp3`, `gift.mp3`. Thiếu file nào thì bỏ qua.

## Tiêu đề, tên công ty, lời chúc cuối

Tất cả nằm trong `src/config.ts`.

## Build và deploy

```bash
npm run build
```

Deploy lên Vercel (cần Vercel cho `api/` và Blob). Push lên nhánh chính là Vercel tự build.

Xem thử bản build:

```bash
npm run preview
```

## Cấu trúc

```
src/
  config.ts              cấu hình chung
  data/departments.json  dữ liệu phòng ban mặc định
  data/siteSchema.ts     kiểu dữ liệu + kiểm tra cấu hình (dùng chung web, admin, API)
  data/siteData.ts       dữ liệu mặc định + tải cấu hình từ /api/config
  admin/                 trang cấu hình /admin
  store/useJourney.ts    trạng thái hành trình
  scene/                 các thành phần 3D (đảo, đường, trạm, nhân vật, hộp quà, camera)
  ui/                    intro, HUD, popup phòng ban, video, outro, cánh hoa rơi
  audio/sound.ts         âm thanh, playlist nhạc nền
api/                     Vercel Functions: config (đọc/lưu), login, upload
```
