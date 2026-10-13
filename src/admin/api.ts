import { useSyncExternalStore } from 'react'
import { upload } from '@vercel/blob/client'
import { defaultSiteData, parseSiteData, type SiteData } from '../data/siteData'

const PW_KEY = 'vn-woman-day:admin-pw'

export function getPassword(): string {
  try {
    return sessionStorage.getItem(PW_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setPassword(pw: string) {
  try {
    if (pw) sessionStorage.setItem(PW_KEY, pw)
    else sessionStorage.removeItem(PW_KEY)
  } catch {
    // Trình duyệt chặn storage: chỉ phải đăng nhập lại khi tải lại trang.
  }
}

/** Lỗi sai/hết mật khẩu: giao diện quay về màn đăng nhập. */
export class AuthError extends Error {}

const authHeader = (pw = getPassword()) => ({ authorization: `Bearer ${pw}` })

async function errorOf(res: Response): Promise<Error> {
  let msg = `Lỗi ${res.status}`
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) msg = body.error
  } catch {
    // Không phải JSON (vd: chạy `npm run dev` không có API).
    if (res.status === 404) msg = 'Không tìm thấy API. Chạy bằng `vercel dev` hoặc trên Vercel.'
  }
  return res.status === 401 ? new AuthError(msg) : new Error(msg)
}

export async function login(pw: string): Promise<void> {
  const res = await fetch('/api/login', { method: 'POST', headers: authHeader(pw) })
  if (!res.ok) throw await errorOf(res)
}

/** Tải cấu hình hiện tại. `saved=false` nghĩa là chưa từng lưu, đang dùng dữ liệu mặc định. */
export async function loadConfig(): Promise<{ data: SiteData; saved: boolean }> {
  const res = await fetch('/api/config', { cache: 'no-store' })
  if (res.status === 404 && res.headers.get('content-type')?.includes('json')) {
    return { data: structuredClone(defaultSiteData), saved: false }
  }
  if (!res.ok) throw await errorOf(res)
  if (!res.headers.get('content-type')?.includes('json')) throw new Error('Không tìm thấy API /api/config.')
  return { data: parseSiteData(await res.json()), saved: true }
}

export async function saveConfig(data: SiteData): Promise<SiteData> {
  const res = await fetch('/api/config', {
    method: 'PUT',
    headers: { ...authHeader(), 'content-type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw await errorOf(res)
  return parseSiteData(await res.json())
}

// ---- Upload ----

let uploading = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Số file đang upload (để khoá nút Lưu). */
export function useUploading(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => uploading,
  )
}

export function slugify(text: string): string {
  return (
    text
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'x'
  )
}

/** Tên file -> tên người/bài: bỏ đuôi, bỏ hậu tố " - ABC", gom khoảng trắng. */
export function nameFromFile(file: File): string {
  const stem = file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ')
  return stem.split(/\s+-\s+/)[0].replace(/\s+/g, ' ').trim() || file.name
}

/** Thu nhỏ ảnh về tối đa `max`px, xuất JPEG (giống scripts/import-photos.py). */
async function resizeImage(file: File, max = 800): Promise<Blob> {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
  return blob ?? file
}

export type UploadFolder = 'images' | 'audio' | 'video'

/**
 * Upload thẳng từ trình duyệt lên Vercel Blob (không qua giới hạn 4.5MB của Function).
 * `subdir` + `baseName` chỉ để đặt tên file dễ đọc; Blob tự thêm hậu tố ngẫu nhiên.
 */
export async function uploadFile(
  file: File,
  folder: UploadFolder,
  baseName: string,
  onProgress?: (percent: number) => void,
  subdir = '',
): Promise<string> {
  uploading++
  emit()
  try {
    let body: Blob = file
    let ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase()
    if (folder === 'images') {
      body = await resizeImage(file)
      if (body.type === 'image/jpeg') ext = 'jpg'
    }
    const dir = subdir ? `${folder}/${slugify(subdir)}` : folder
    const pathname = `${dir}/${slugify(baseName)}${ext ? `.${ext}` : ''}`
    const res = await upload(pathname, body, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      headers: authHeader(),
      contentType: body.type || file.type || undefined,
      multipart: body.size > 20 * 1024 * 1024,
      onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.percentage)) : undefined,
    })
    return res.url
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/401|mật khẩu/i.test(msg)) throw new AuthError('Sai mật khẩu')
    throw new Error(`Upload "${file.name}" thất bại: ${msg}`)
  } finally {
    uploading--
    emit()
  }
}

export function newId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)
}
