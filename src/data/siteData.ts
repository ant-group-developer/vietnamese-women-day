import raw from './departments.json'
import { parseSiteData, type Department, type SiteData } from './siteSchema'

export * from './siteSchema'

/** Dữ liệu mặc định đóng gói sẵn: dùng khi chưa lưu cấu hình nào trên server hoặc API lỗi. */
export const defaultSiteData: SiteData = {
  version: 1,
  departments: raw.departments as Department[],
  music: {
    tracks: [
      {
        id: 'default',
        title: 'Carefree',
        url: 'https://pub-f692d310eeed42d99d90cd6bcdd7a979.r2.dev/vietnamese-women-day/audio/carefree-f7G23nzBWCotiNEFXyxq7ut2tVe8V2.mp3',
      },
    ],
    shuffle: false,
    volume: 0.15,
  },
  video: { type: 'youtube', src: 'https://youtu.be/_i_wbXld_78' },
  bonuses: [
    { id: 'b1', type: 'youtube', src: 'https://youtu.be/_i_wbXld_78', flowers: 2, title: 'Phần quà 1' },
    { id: 'bmv98lyhk', type: 'youtube', src: 'https://youtu.be/VQO2QAs4Uko', flowers: 5, title: 'Phần quà 2' },
  ],
}

/** Cấu hình đang dùng. Được gán 1 lần trong main.tsx trước khi import App. */
export let siteData: SiteData = defaultSiteData

export function setSiteData(data: SiteData) {
  siteData = data
}

/** Tải cấu hình từ /api/config; trả null nếu chưa có hoặc lỗi. */
export async function fetchSiteData(timeoutMs = 5000): Promise<SiteData | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch('/api/config', { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) return null
    return parseSiteData(await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
