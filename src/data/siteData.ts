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
  // Video trên đảo: điền link YouTube vào `src` (hoặc sửa ở trang /admin, tab Video).
  islandVideos: [
    { island: 'tropical', type: 'youtube', src: '', title: 'Video Đảo Nhiệt Đới' },
    { island: 'blossom', type: 'youtube', src: '', title: 'Video Đảo Hoa Anh Đào' },
  ],
}

/** Cấu hình đang dùng. Được gán 1 lần trong main.tsx trước khi import App. */
export let siteData: SiteData = defaultSiteData

export function setSiteData(data: SiteData) {
  siteData = data
}

/** Link công khai của config/site.json trên Blob (điền lúc build, xem vite.config.ts). */
const CONFIG_URL: string = import.meta.env.VITE_CONFIG_URL ?? ''

async function load(url: string, signal: AbortSignal): Promise<SiteData | null> {
  try {
    const res = await fetch(url, { signal, cache: 'no-store' })
    return res.ok ? parseSiteData(await res.json()) : null
  } catch {
    return null
  }
}

/**
 * Tải cấu hình: đọc thẳng file trên Blob (CDN cache 60s, không tốn lượt `list` của Blob);
 * chưa có file đó hoặc lỗi thì hỏi /api/config. Trả null nếu chưa có cấu hình hoặc lỗi.
 */
export async function fetchSiteData(timeoutMs = 5000): Promise<SiteData | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return (CONFIG_URL && (await load(CONFIG_URL, ctrl.signal))) || (await load('/api/config', ctrl.signal))
  } finally {
    clearTimeout(timer)
  }
}
