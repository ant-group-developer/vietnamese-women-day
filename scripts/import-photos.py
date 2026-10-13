# -*- coding: utf-8 -*-
"""
Nhập ảnh từ thư mục tải về (mỗi thư mục con = 1 phòng ban, mỗi file = 1 người)
-> resize, chuyển sang JPG vào public/images/<slug>/ và sinh src/data/departments.json.

Chạy: python scripts/import-photos.py "<thư mục nguồn>"
Cần: pip install pillow pillow-heif
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "raw-photos"
OUT = ROOT / "public" / "images"
JSON_OUT = ROOT / "src" / "data" / "departments.json"
MAX_SIZE = 800
EXTS = {".jpg", ".jpeg", ".png", ".heif", ".heic", ".webp"}

# Thông tin hiển thị cho từng thư mục (tên thư mục viết hoa làm khóa). Thư mục lạ sẽ dùng mặc định.
DEPT_META = {
    "KẾ TOÁN": dict(order=1, name="Phòng Kế toán", icon="💰", color="#ffb347",
                    message="Tỉ mỉ từng con số, giữ cho công ty luôn vững vàng."),
    "HCNS": dict(order=2, name="Phòng Hành chính Nhân sự", icon="🤝", color="#8ed6ff",
                 message="Người giữ lửa, chăm lo cho từng thành viên trong đại gia đình ANT."),
    "PHÒNG AM2": dict(order=3, name="Phòng AM2", icon="🚀", color="#ff8c69",
                      message="Những chiến binh luôn hết mình vì khách hàng."),
    "PHÒNG AM3": dict(order=4, name="Phòng AM3", icon="🌟", color="#c77dff",
                      message="Năng lượng tràn đầy, chinh phục mọi mục tiêu."),
    "PHÒNG IP": dict(order=5, name="Phòng IP", icon="💡", color="#5ed6b0",
                     message="Sáng tạo không giới hạn, bảo vệ từng ý tưởng."),
    "PHÒNG QL&PH": dict(order=6, name="Phòng QL&PH", icon="📋", color="#ffd166",
                        message="Hậu phương vững chắc, mọi việc đều đâu vào đấy."),
    "PHÒNG SX": dict(order=7, name="Phòng Sản xuất", icon="🏭", color="#ff9fbf",
                     message="Bàn tay khéo léo tạo nên từng sản phẩm chất lượng."),
}
DEFAULT_COLORS = ["#ff7aa8", "#ffb347", "#8ed6ff", "#c77dff", "#5ed6b0", "#ffd166", "#ff9fbf", "#ff8c69"]


def slugify(text: str) -> str:
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return text or "x"


def clean_name(stem: str) -> str:
    # Bỏ hậu tố kiểu " - AM3", chuẩn hoá viết hoa chữ cái đầu mỗi từ.
    name = re.split(r"\s+-\s+", stem)[0].strip()
    name = re.sub(r"\s+", " ", name)
    return " ".join(w[:1].upper() + w[1:].lower() for w in name.split(" "))


def convert(src: Path, dst: Path) -> None:
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        im.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "JPEG", quality=85, optimize=True, progressive=True)


def main() -> None:
    if not SRC.is_dir():
        sys.exit(f"Không tìm thấy thư mục nguồn: {SRC}")

    folders = sorted(p for p in SRC.iterdir() if p.is_dir())
    departments = []
    for i, folder in enumerate(folders):
        key = folder.name.strip().upper()
        meta = DEPT_META.get(key) or dict(
            order=100 + i, name=folder.name.strip().title(), icon="🌸",
            color=DEFAULT_COLORS[i % len(DEFAULT_COLORS)],
            message="Chúc các chị em luôn xinh đẹp và hạnh phúc!",
        )
        slug = slugify(folder.name)
        members = []
        for f in sorted(folder.iterdir()):
            if f.suffix.lower() not in EXTS:
                continue
            name = clean_name(f.stem)
            photo_name = slugify(name) + ".jpg"
            dst = OUT / slug / photo_name
            convert(f, dst)
            members.append({"name": name, "photo": f"/images/{slug}/{photo_name}"})
            print(f"  {folder.name}/{f.name} -> images/{slug}/{photo_name}")
        departments.append(dict(order=meta["order"], slug=slug, name=meta["name"], color=meta["color"],
                                icon=meta["icon"], message=meta["message"], members=members))

    departments.sort(key=lambda d: d["order"])
    for d in departments:
        d.pop("order")
    JSON_OUT.write_text(json.dumps({"departments": departments}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(len(d["members"]) for d in departments)
    print(f"Xong: {len(departments)} phòng ban, {total} người. Đã ghi {JSON_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
