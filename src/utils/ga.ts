const GA_MEASUREMENT_ID = 'G-LRVDH81XRL'

/** Gửi sự kiện GA4 (không làm gì khi GA chưa nạp, vd. lúc dev). */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  w.gtag?.('event', name, params)
}

/** Google Analytics 4: chỉ nạp ở bản build (không chạy khi `npm run dev`). */
export function initGA() {
  if (import.meta.env.DEV) return
  const id = GA_MEASUREMENT_ID

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)

  const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void }
  w.dataLayer = w.dataLayer || []
  // gtag.js đọc đúng đối tượng `arguments`, không dùng rest params.
  w.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments)
  }
  w.gtag('js', new Date())
  w.gtag('config', id)
}
