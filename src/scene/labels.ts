import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { portraitZoom } from './cameraControl'

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
  /** Khoảng cách tới camera bắt đầu mờ dần (mờ hẳn sau thêm 10). */
  fadeFrom: number
}

const FADE_FROM = 30
/** Nhãn trên đảo phụ mờ muộn hơn nhãn trạm: đứng trên đảo camera cách khoảng 31 mà nhãn vẫn phải đọc được. */
export const ISLAND_LABEL_FADE = 36

const targets = new Map<string, LabelTarget>()
const tmp = new THREE.Vector3()

export function setLabelTarget(key: string, pos: THREE.Vector3, priority = 0, fadeFrom = FADE_FROM) {
  const t = targets.get(key)
  if (t) {
    t.pos = pos
    t.priority = priority
    t.fadeFrom = fadeFrom
  } else targets.set(key, { pos, el: null, priority, fadeFrom })
}

export function bindLabelElement(key: string, el: HTMLElement | null) {
  const t = targets.get(key)
  if (t) t.el = el
  else targets.set(key, { pos: new THREE.Vector3(), el, priority: 0, fadeFrom: FADE_FROM })
}

/** Đặt trong <Canvas>: chiếu toạ độ 3D sang pixel và gán transform cho từng nhãn. */
export function LabelProjector() {
  const { camera, size } = useThree()
  useFrame(() => {
    // Màn dọc camera lùi xa hơn (portraitZoom) nên ngưỡng mờ dần cũng giãn ra theo, kẻo nhãn trên điện thoại mờ hết.
    const zoom = portraitZoom(size.width, size.height)
    targets.forEach(({ pos, el, priority, fadeFrom }) => {
      if (!el) return
      tmp.copy(pos).project(camera)
      const behind = tmp.z > 1
      const x = ((tmp.x + 1) / 2) * size.width
      const y = ((1 - tmp.y) / 2) * size.height
      const dist = camera.position.distanceTo(pos)
      const scale = THREE.MathUtils.clamp(15 / dist, 0.55, 1.25)
      // Nhãn xa camera thì mờ dần và nằm dưới nhãn gần hơn.
      const fade = THREE.MathUtils.clamp((fadeFrom * zoom - dist) / (10 * zoom), 0, 1)
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`
      el.style.opacity = behind ? '0' : fade.toFixed(2)
      el.style.zIndex = String(Math.round(1000 - dist * 10 + priority))
    })
  })
  return null
}
