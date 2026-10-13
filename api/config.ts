import { del, list, put } from '@vercel/blob'
import { parseSiteData } from '../src/data/siteSchema.js'
import { isAuthorized, json, unauthorized } from './_auth.js'

/** Mỗi lần lưu là 1 file mới (tránh cache CDN khi ghi đè); giữ lại vài bản gần nhất để khôi phục khi cần. */
const PREFIX = 'config/site-'
const KEEP = 10

async function listVersions() {
  const blobs = []
  let cursor: string | undefined
  do {
    const res = await list({ prefix: PREFIX, cursor })
    blobs.push(...res.blobs)
    cursor = res.hasMore ? res.cursor : undefined
  } while (cursor)
  return blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
}

export async function GET(): Promise<Response> {
  // Chưa kết nối Blob store: coi như chưa có cấu hình để web chạy bằng dữ liệu mặc định.
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return json({ error: 'Chưa kết nối Vercel Blob' }, 404)
  try {
    const [latest] = await listVersions()
    // 404 = chưa có cấu hình nào được lưu, web dùng dữ liệu mặc định.
    if (!latest) return json({ error: 'Chưa có cấu hình' }, 404)
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
    await put(`${PREFIX}${now.getTime()}.json`, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })
    const old = (await listVersions()).slice(KEEP)
    if (old.length) await del(old.map((b) => b.url))
    return json(data)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Lưu thất bại' }, 500)
  }
}
