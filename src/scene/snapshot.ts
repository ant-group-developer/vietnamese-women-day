import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

let source: { canvas: HTMLCanvasElement; render: () => void } | null = null

/** Đặt trong <Canvas>: cho phép UI bên ngoài chụp khung hình 3D hiện tại. */
export function SnapshotBinder() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const mine = { canvas: gl.domElement, render: () => gl.render(scene, camera) }
    source = mine
    return () => {
      // Chỉ gỡ khi chưa bị bản mount sau ghi đè (StrictMode/HMR có thể dọn bản cũ sau khi bản mới đã gắn).
      if (source === mine) source = null
    }
  }, [gl, scene, camera])
  return null
}

/** Kích thước (pixel) của khung hình 3D, null nếu cảnh chưa sẵn sàng. */
export function sceneSize(): { width: number; height: number } | null {
  if (!source || !source.canvas.width || !source.canvas.height) return null
  return { width: source.canvas.width, height: source.canvas.height }
}

/**
 * Vẽ khung hình 3D hiện tại lên `ctx` tại (x, y, w, h).
 * Canvas không bật preserveDrawingBuffer nên vẽ lại một frame rồi chép ngay trong cùng lượt (không await giữa chừng).
 */
export function drawScene(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): boolean {
  if (!source) return false
  source.render()
  ctx.drawImage(source.canvas, x, y, w, h)
  return true
}
