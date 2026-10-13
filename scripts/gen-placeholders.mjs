/**
 * Sinh ảnh placeholder (SVG) cho những thành viên chưa có ảnh thật trong public/images.
 * Chạy: npm run placeholders
 * Ảnh thật (jpg/png) đặt đúng đường dẫn trong departments.json sẽ được giữ nguyên.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(readFileSync(join(root, 'src/data/departments.json'), 'utf8'))

const PASTELS = ['#ffb3c6', '#ffd6a5', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#fdffb6']
const FACES = ['😊', '😄', '🥰', '😁', '😍', '🤗', '😉', '😇']

let created = 0
let kept = 0

for (const dept of data.departments) {
  for (const m of dept.members) {
    if (!m.photo) continue
    const rel = m.photo.replace(/^\//, '')
    const target = join(root, 'public', rel)
    if (existsSync(target)) {
      kept++
      continue
    }
    // Chỉ sinh placeholder cho đường dẫn .svg; ảnh thật (.jpg/.png) thiếu sẽ được web tự thay bằng avatar chữ cái.
    if (extname(target).toLowerCase() !== '.svg') {
      console.log(`Bỏ qua (không phải .svg): ${rel}`)
      continue
    }
    let hash = 0
    for (const ch of m.name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    const bg = PASTELS[hash % PASTELS.length]
    const face = FACES[hash % FACES.length]
    const parts = m.name.trim().split(/\s+/)
    const initial = parts[parts.length - 1].charAt(0).toUpperCase()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <circle cx="200" cy="150" r="78" fill="#fff" opacity="0.9"/>
  <ellipse cx="200" cy="340" rx="130" ry="95" fill="#fff" opacity="0.9"/>
  <text x="200" y="178" text-anchor="middle" font-family="Baloo 2, Segoe UI, sans-serif" font-size="80" font-weight="800" fill="#7a2d4e">${initial}</text>
  <text x="200" y="330" text-anchor="middle" font-size="64">${face}</text>
  <text x="200" y="385" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="20" fill="#7a2d4e" opacity="0.6">ảnh mẫu</text>
</svg>`
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, svg, 'utf8')
    created++
  }
}

console.log(`Đã tạo ${created} ảnh placeholder, giữ nguyên ${kept} ảnh có sẵn.`)
