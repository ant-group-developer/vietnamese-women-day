import { config } from '../config'
import { STATION_COUNT } from '../data/departments'
import { CHARACTERS } from '../scene/characters'
import { drawScene, sceneSize } from '../scene/snapshot'
import { useJourney } from '../store/useJourney'
import { photoSpots } from '../scene/route'

const FONT = '"Baloo 2", "Segoe UI", system-ui, sans-serif'
const PINK = '#f0558a'
const TEXT = '#5a2d44'

/** Tự vẽ khung bo góc (ctx.roundRect chưa có trên Safari cũ). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Chữ căn giữa, tự thu nhỏ cỡ chữ nếu dài quá `maxW`. */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight: number) {
  let s = size
  ctx.font = `${weight} ${s}px ${FONT}`
  while (s > 10 && ctx.measureText(text).width > maxW) {
    s -= 2
    ctx.font = `${weight} ${s}px ${FONT}`
  }
  ctx.fillText(text, x, y)
}

/**
 * Chụp khung hình 3D hiện tại và ghép khung ảnh kỷ niệm kiểu polaroid:
 * ảnh bo góc, dải dưới có lời chúc, tên công ty, bạn đồng hành và số hoa đã thu.
 */
export async function takePhoto(): Promise<Blob | null> {
  const size = sceneSize()
  if (!size) return null
  try {
    await document.fonts.load(`800 40px "Baloo 2"`)
  } catch {
    /* không tải được font thì dùng font dự phòng */
  }

  // Ảnh rộng 1080–1600px: đủ nét để đăng story, không quá nặng.
  const photoW = Math.round(Math.min(1600, Math.max(1080, size.width)))
  const photoH = Math.round((photoW * size.height) / size.width)
  const u = photoW / 100
  const pad = Math.round(4.5 * u)
  const strip = Math.round(25 * u)
  const W = photoW + pad * 2
  const H = photoH + pad + strip

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Nền giấy kem pha hồng.
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#fffaf3')
  bg.addColorStop(1, '#ffe1ec')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Ảnh cảnh 3D, bo góc. Canvas 3D trong suốt (alpha) nên vẽ trước nền trời giống nền trang (body trong index.css).
  const r = 3 * u
  ctx.save()
  roundRect(ctx, pad, pad, photoW, photoH, r)
  ctx.clip()
  const sky = ctx.createLinearGradient(0, pad, 0, pad + photoH)
  sky.addColorStop(0, '#ffd9e8')
  sky.addColorStop(0.3, '#ffe9f1')
  sky.addColorStop(0.7, '#cfeaff')
  sky.addColorStop(1, '#e9f7ff')
  ctx.fillStyle = sky
  ctx.fillRect(pad, pad, photoW, photoH)
  const ok = drawScene(ctx, pad, pad, photoW, photoH)
  ctx.restore()
  if (!ok) return null
  ctx.lineWidth = 0.4 * u
  ctx.strokeStyle = 'rgba(240, 85, 138, 0.35)'
  roundRect(ctx, pad, pad, photoW, photoH, r)
  ctx.stroke()

  // Hoa dán ở hai góc ảnh.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const sticker = (x: number, y: number, s: number, rot: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.font = `${s}px ${FONT}`
    ctx.fillText('🌸', 0, 0)
    ctx.restore()
  }
  sticker(pad + 1.5 * u, pad + 1.5 * u, 9 * u, -0.3)
  sticker(pad + photoW - 2 * u, pad + photoH - 1 * u, 7 * u, 0.4)

  // Dải chữ phía dưới.
  const { visited, character, atSpot } = useJourney.getState()
  const place = atSpot >= 0 ? ` · tại ${photoSpots[atSpot].island.name}` : ''
  const count = visited.filter(Boolean).length
  const pet = CHARACTERS[character]
  const cx = W / 2
  const maxW = photoW - 4 * u
  let y = pad + photoH + 7.5 * u
  ctx.fillStyle = PINK
  fitText(ctx, `${config.title} 🌸`, cx, y, maxW, 7.2 * u, 800)
  y += 7 * u
  ctx.fillStyle = TEXT
  fitText(ctx, `${config.companyName} · cùng ${pet.name} ${pet.emoji}${place}`, cx, y, maxW, 3.8 * u, 600)
  y += 5.6 * u
  const flowers = Array.from({ length: STATION_COUNT }, (_, i) => (i < count ? '🌸' : '🤍')).join(' ')
  const date = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  ctx.fillStyle = PINK
  fitText(ctx, `${flowers}  ·  ${count}/${STATION_COUNT} bông hoa  ·  ${date}`, cx, y, maxW, 3.4 * u, 700)

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92))
}
