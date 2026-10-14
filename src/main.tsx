import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { fetchSiteData, setSiteData } from './data/siteData'

// Tải cấu hình (phòng ban, nhạc, video) TRƯỚC khi import App: bản đồ 3D được dựng ngay lúc module load
// dựa trên số phòng ban. Lỗi/timeout thì giữ dữ liệu mặc định.
async function boot() {
  const data = await fetchSiteData()
  if (data) setSiteData(data)
  const { default: App } = await import('./App')
  // Không dùng StrictMode: drei <Html> tạo root React riêng và StrictMode (mount 2 lần) gây cảnh báo unmount.
  createRoot(document.getElementById('root')!).render(
    <>
      <App />
      <SpeedInsights />
      <Analytics />
    </>,
  )
}

void boot()
