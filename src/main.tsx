import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Không dùng StrictMode: drei <Html> tạo root React riêng và StrictMode (mount 2 lần) gây cảnh báo unmount.
createRoot(document.getElementById('root')!).render(<App />)
