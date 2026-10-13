import { isAuthorized, json, unauthorized } from './_auth.js'

export function POST(request: Request): Response {
  if (!isAuthorized(request)) return unauthorized()
  return json({ ok: true })
}
