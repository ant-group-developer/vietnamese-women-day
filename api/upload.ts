import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { isAuthorized, json, unauthorized } from './_auth.js'

/** Thư mục được phép upload và loại file tương ứng. */
const RULES: Record<string, { types: string[]; maxBytes: number }> = {
  images: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * 1024 * 1024 },
  audio: { types: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac'], maxBytes: 50 * 1024 * 1024 },
  video: { types: ['video/mp4', 'video/webm'], maxBytes: 300 * 1024 * 1024 },
}

export async function POST(request: Request): Promise<Response> {
  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return json({ error: 'Dữ liệu không hợp lệ' }, 400)
  }

  // Bước xin token upload phải có mật khẩu (các callback khác do Vercel gọi, đã được SDK kiểm tra chữ ký).
  if (body.type === 'blob.generate-client-token' && !isAuthorized(request)) return unauthorized()

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const rule = RULES[pathname.split('/')[0]]
        if (!rule || pathname.includes('..')) throw new Error('Đường dẫn upload không hợp lệ')
        return {
          allowedContentTypes: rule.types,
          maximumSizeInBytes: rule.maxBytes,
          addRandomSuffix: true,
        }
      },
    })
    return json(result)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Upload thất bại' }, 400)
  }
}
