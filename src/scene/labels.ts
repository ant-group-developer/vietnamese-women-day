import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Nhãn HTML nổi trên các vật thể 3D.
 * Các phần tử DOM đăng ký ở đây và được LabelProjector cập nhật vị trí mỗi frame
 * (không cần React root riêng như drei <Html>).
 */
interface LabelTarget {
  pos: THREE.Vector3
  el: HTMLElement | null
  /** Cộng thêm vào z-index để nhãn quan trọng luôn nằm trên các nhãn khác. */
  priority: number
}

const targets = new Map<string, LabelTarget>()
const tmp = new THREE.Vector3()

export function setLabelTarget(key: string, pos: THREE.Vector3, priority = 0) {
  const t = targets.get(key)
  if (t) {
    t.pos = pos
    t.priority = priority
  } else targets.set(key, { pos, el: null, priority })
}

export function bindLabelElement(key: string, el: HTMLElement | null) {
  const t = targets.get(key)
  if (t) t.el = el
  else targets.set(key, { pos: new THREE.Vector3(), el, priority: 0 })
}

/** Đặt trong <Canvas>: chiếu toạ độ 3D sang pixel và gán transform cho từng nhãn. */
export function LabelProjector() {
  const { camera, size } = useThree()
  useFrame(() => {
    targets.forEach(({ pos, el, priority }) => {
      if (!el) return
      tmp.copy(pos).project(camera)
      const behind = tmp.z > 1
      const x = ((tmp.x + 1) / 2) * size.width
      const y = ((1 - tmp.y) / 2) * size.height
      const dist = camera.position.distanceTo(pos)
      const scale = THREE.MathUtils.clamp(15 / dist, 0.55, 1.25)
      // Nhãn xa camera thì mờ dần và nằm dưới nhãn gần hơn.
      const fade = THREE.MathUtils.clamp((30 - dist) / 10, 0, 1)
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`
      el.style.opacity = behind ? '0' : fade.toFixed(2)
      el.style.zIndex = String(Math.round(1000 - dist * 10 + priority))
    })
  })
  return null
}
