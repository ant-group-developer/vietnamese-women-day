import { siteData } from './siteData'

export type { Department, Member } from './siteSchema'

/**
 * Danh sách phòng ban lấy từ cấu hình đã tải (xem main.tsx).
 * Module này chỉ được import sau khi main.tsx gọi setSiteData(), vì path.ts dựng bản đồ ngay lúc load.
 */
export const departments = siteData.departments

/** Số trạm phòng ban (không tính hộp quà). */
export const STATION_COUNT = departments.length
/** Chỉ số của hộp quà trên đường đi (ngay sau trạm cuối). */
export const GIFT_INDEX = STATION_COUNT

const PASTELS = ['#ffb3c6', '#ffd6a5', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#fdffb6']

/** Avatar dự phòng khi ảnh thiếu/lỗi: hình tròn pastel + chữ cái đầu của tên. */
export function fallbackAvatar(name: string): string {
  const parts = name.trim().split(/\s+/)
  const initial = (parts[parts.length - 1] ?? '?').charAt(0).toUpperCase()
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const bg = PASTELS[hash % PASTELS.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" rx="44" fill="${bg}"/>
    <circle cx="100" cy="78" r="36" fill="#fff" opacity="0.85"/>
    <ellipse cx="100" cy="170" rx="62" ry="46" fill="#fff" opacity="0.85"/>
    <text x="100" y="92" text-anchor="middle" font-family="Baloo 2, Segoe UI, sans-serif" font-size="44" font-weight="800" fill="#7a2d4e">${initial}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
