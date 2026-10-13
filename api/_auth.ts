import { createHash, timingSafeEqual } from 'node:crypto'

const sha = (s: string) => createHash('sha256').update(s).digest()

/** Kiểm tra header `Authorization: Bearer <ADMIN_PASSWORD>`. */
export function isAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  const header = request.headers.get('authorization') ?? ''
  const given = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!given) return false
  // So sánh hash để độ dài bằng nhau và không lộ thông tin qua thời gian chạy.
  return timingSafeEqual(sha(given), sha(expected))
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export function unauthorized(): Response {
  if (!process.env.ADMIN_PASSWORD) return json({ error: 'Chưa cấu hình ADMIN_PASSWORD trên server' }, 500)
  return json({ error: 'Sai mật khẩu' }, 401)
}
