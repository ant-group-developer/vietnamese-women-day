import { copy, del, list, put } from '@vercel/blob'
import { parseSiteData } from '../src/data/siteSchema.js'
import { isAuthorized, json, unauthorized } from './_auth.js'

/**
 * Mỗi lần lưu ghi 2 file:
 * - `config/site.json` (tên cố định, ghi đè, CDN cache 60s): web chính đọc thẳng file này từ Blob,
 *   không qua function và không tốn lượt `list` (Advanced Operation) cho mỗi lượt xem.
 * - `config/site-<thời gian>.json`: bản sao, giữ lại vài bản gần nhất để khôi phục khi cần.
 * Trang admin vẫn đọc qua GET bên dưới (dùng `list`) để thấy bản mới nhất ngay sau khi lưu.
 */
const LATEST = 'config/site.json'
const PREFIX = 'config/site-'
const KEEP = 10
const LATEST_OPTIONS = {
  access: 'public',
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 60,
} as const

async function listConfig() {
  const blobs = []
  let cursor: string | undefined
  do {
    const res = await list({ prefix: 'config/', cursor })
    blobs.push(...res.blobs)
    cursor = res.hasMore ? res.cursor : undefined
  } while (cursor)
  const versions = blobs
    .filter((b) => b.pathname.startsWith(PREFIX))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  return { versions, hasLatest: blobs.some((b) => b.pathname === LATEST) }
}

export async function GET(): Promise<Response> {
  // Chưa kết nối Blob store: coi như chưa có cấu hình để web chạy bằng dữ liệu mặc định.
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return json({ error: 'Chưa kết nối Vercel Blob' }, 404)
  try {
    const { versions, hasLatest } = await listConfig()
    const [latest] = versions
    // 404 = chưa có cấu hình nào được lưu, web dùng dữ liệu mặc định.
    if (!latest) return json({ error: 'Chưa có cấu hình' }, 404)
    // Cấu hình lưu từ trước khi có file cố định: tạo một lần để web chính đọc thẳng được.
    if (!hasLatest) await copy(latest.url, LATEST, LATEST_OPTIONS).catch(() => {})
    const res = await fetch(latest.url, { cache: 'no-store' })
    if (!res.ok) return json({ error: 'Không đọc được cấu hình' }, 502)
    return json(await res.json())
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Lỗi server' }, 500)
  }
}

export async function PUT(request: Request): Promise<Response> {
  if (!isAuthorized(request)) return unauthorized()

  let data
  try {
    data = parseSiteData(await request.json())
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Dữ liệu không hợp lệ' }, 400)
  }

  try {
    const now = new Date()
    data.updatedAt = now.toISOString()
    const body = JSON.stringify(data)
    // Ghi file cố định trước: nếu bản sao lỗi thì chỉ mất 1 bản sao lưu, web vẫn thấy bản mới.
    await put(LATEST, body, LATEST_OPTIONS)
    await put(`${PREFIX}${now.getTime()}.json`, body, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })
    const old = (await listConfig()).versions.slice(KEEP)
    if (old.length) await del(old.map((b) => b.url))
    return json(data)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Lưu thất bại' }, 500)
  }
}
