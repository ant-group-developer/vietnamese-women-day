# -*- coding: utf-8 -*-
"""
Chuyển ảnh nhân viên trong src/data/departments.json về dạng tối ưu, lưu thẳng vào repo:
  public/images/<slug>/<ten>.webp        (tối đa 800px, cho lightbox)
  public/images/<slug>/<ten>.thumb.webp  (tối đa 320px, cho ô ảnh trong modal)
rồi đổi đường dẫn trong departments.json sang .webp và xoá file .jpg/.png cũ.

Ảnh đang nằm trên Vercel Blob (link http...) cũng được tải về repo.
Muốn lấy cấu hình đang lưu trên Vercel làm gốc: thêm --from https://<ten-mien>/api/config

Chạy: python scripts/optimize-photos.py [--from URL]
Cần: pip install pillow (thêm pillow-heif nếu có ảnh HEIC)
"""
import io
import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps
try:  # Chỉ cần khi có ảnh HEIC từ iPhone.
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
JSON_PATH = ROOT / "src" / "data" / "departments.json"
FULL_SIZE, FULL_QUALITY = 800, 80
THUMB_SIZE, THUMB_QUALITY = 320, 75


def slugify(text: str) -> str:
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return text or "x"


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "optimize-photos"}), timeout=60) as r:
        return r.read()


def read_source(photo: str) -> bytes | None:
    if photo.startswith(("http://", "https://")):
        return fetch(photo)
    path = PUBLIC / photo.lstrip("/")
    if path.is_file():
        return path.read_bytes()
    # Cấu hình cũ trỏ .jpg nhưng ảnh đã được chuyển sang .webp từ lần chạy trước.
    webp = path.with_suffix(".webp")
    return webp.read_bytes() if webp.is_file() else None


def save_webp(im: Image.Image, size: int, quality: int, dst: Path) -> None:
    im = im.copy()
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(dst, "WEBP", quality=quality, method=6)


def main() -> None:
    args = sys.argv[1:]
    if args[:1] == ["--from"] and len(args) > 1:
        remote = json.loads(fetch(args[1]))
        data = {"departments": remote["departments"]}
        print(f"Lấy phòng ban từ {args[1]}")
    else:
        data = json.loads(JSON_PATH.read_text(encoding="utf-8"))

    keep: set[Path] = set()
    before = after = 0
    for dept in data["departments"]:
        for m in dept["members"]:
            photo = m.get("photo")
            if not photo or photo.startswith("data:"):
                continue
            raw = read_source(photo)
            if raw is None:
                print(f"  !! Không tìm thấy ảnh: {photo}")
                continue
            folder = PUBLIC / "images" / dept["slug"]
            folder.mkdir(parents=True, exist_ok=True)
            # Giữ tên file cũ để cấu hình đang lưu trên Vercel (trỏ .jpg) vẫn tìm được ảnh .webp.
            stem = slugify(m["name"]) if photo.startswith(("http://", "https://")) else Path(photo).stem
            full = folder / f"{stem}.webp"
            thumb = full.with_suffix(".thumb.webp")
            with Image.open(io.BytesIO(raw)) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                save_webp(im, FULL_SIZE, FULL_QUALITY, full)
                save_webp(im, THUMB_SIZE, THUMB_QUALITY, thumb)
            keep.update((full, thumb))
            before += len(raw)
            after += thumb.stat().st_size
            m["photo"] = "/" + full.relative_to(PUBLIC).as_posix()
            print(f"  {photo} -> {m['photo']}")

    # Xoá ảnh cũ (jpg/png/webp không còn ai dùng) trong các thư mục phòng ban.
    for f in (PUBLIC / "images").glob("*/*"):
        if f.parent.name == "characters" or f in keep:
            continue
        if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            f.unlink()
            print(f"  xoá {f.relative_to(ROOT).as_posix()}")

    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=4) + "\n", encoding="utf-8", newline="\n")
    n = len(keep) // 2
    print(f"Xong {n} ảnh. Ô ảnh trong modal: {before // 1024} KB -> {after // 1024} KB (thumbnail).")


if __name__ == "__main__":
    main()
