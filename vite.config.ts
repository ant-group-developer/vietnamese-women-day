import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const API_ROUTES = new Set(['config', 'login', 'upload'])

/**
 * Chỉ khi `npm run dev`: chạy các Vercel Function trong api/ ngay trong dev server,
 * để dùng được /admin mà không cần `vercel dev`. Biến môi trường lấy từ .env.local
 * (tạo bằng `vercel env pull .env.local`).
 */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const route = url.pathname.match(/^\/api\/([a-z]+)$/)?.[1]
        if (!route || !API_ROUTES.has(route)) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${route}.ts`)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const response: Response = await handler(
            new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined }),
          )
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          next(e)
        }
      })
    },
  }
}

/**
 * Điền `%SITE_URL%` trong index.html (canonical, og:url, og:image...) — mạng xã hội cần URL tuyệt đối.
 * Lấy từ SITE_URL nếu có, không thì tên miền production Vercel tự cấp lúc build; không có thì để trống (URL tương đối).
 */
function siteUrl(): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
        const url = (process.env.SITE_URL || (host ? `https://${host}` : '')).replace(/\/+$/, '')
        return html.replaceAll('%SITE_URL%', url)
      },
    },
  }
}

/**
 * Link công khai của config/site.json trên Vercel Blob (xem api/config.ts), để web chính đọc thẳng.
 * Suy ra từ id store nằm trong token (`vercel_blob_rw_<id>_<bí mật>`), không đưa phần bí mật vào bundle.
 */
function blobConfigUrl(): string {
  const id = process.env.BLOB_READ_WRITE_TOKEN?.split('_')[3] || process.env.BLOB_STORE_ID?.replace(/^store_/, '')
  return id ? `https://${id.toLowerCase()}.public.blob.vercel-storage.com/config/site.json` : ''
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) process.env[k] ??= v
  return {
    plugins: [react(), devApi(), siteUrl()],
    define: { 'import.meta.env.VITE_CONFIG_URL': JSON.stringify(blobConfigUrl()) },
    server: { port: 5280 },
    preview: { port: 5280 },
    build: {
      rollupOptions: {
        // Trang chính + trang cấu hình /admin (bundle riêng, không kéo three.js).
        input: { main: 'index.html', admin: 'admin.html' },
      },
    },
  }
})
