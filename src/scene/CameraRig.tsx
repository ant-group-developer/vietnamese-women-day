import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useJourney } from '../store/useJourney'
import { housePosition, mascot } from './path'
import { damp } from './utils'
import { cameraCmd } from './cameraControl'

export const CAMERA_OFFSET = new THREE.Vector3(2.5, 8.5, 10)
const GIFT_OFFSET = new THREE.Vector3(0, 5.5, 9)

const focus = new THREE.Vector3()
const delta = new THREE.Vector3()
const desired = new THREE.Vector3()
const giftLift = new THREE.Vector3(0, 1.2, 0)
const offset = new THREE.Vector3()
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const MIN_DIST = 5
const MAX_DIST = 32

/** Màn hình dọc (điện thoại) hẹp hơn nên lùi camera ra xa để thấy đủ nhà và đường. */
function portraitZoom(width: number, height: number) {
  const aspect = width / height
  return aspect < 1 ? 1 + (1 - aspect) * 1.1 : 1
}

/**
 * Camera luôn cho phép xoay/zoom (OrbitControls), đồng thời bám theo nhân vật:
 * mỗi frame dịch cả target lẫn camera theo chuyển động của nhân vật nên góc nhìn
 * người dùng đã chọn được giữ nguyên. Nút "về nhân vật" đưa camera về góc mặc định.
 */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const initialized = useRef(false)
  const resetUntil = useRef(0)
  const seenResetAt = useRef(0)
  const seenPhase = useRef('')

  useFrame(({ camera, size, clock }, dt) => {
    const c = controls.current
    if (!c) return
    const now = clock.elapsedTime
    const { openedIndex, phase, currentIndex, cameraResetAt } = useJourney.getState()
    const giftFocus = phase === 'opening' || phase === 'gift' || phase === 'video' || phase === 'outro'

    if (giftFocus) focus.copy(housePosition(currentIndex)).add(giftLift)
    else if (openedIndex !== null) focus.copy(housePosition(openedIndex)).lerp(mascot.pos, 0.5)
    else focus.copy(mascot.pos)

    // Yêu cầu đưa camera về góc mặc định (nút HUD, restart, hoặc khi tới hộp quà).
    if (cameraResetAt !== seenResetAt.current) {
      seenResetAt.current = cameraResetAt
      resetUntil.current = now + 1.5
    }
    if (phase !== seenPhase.current) {
      if (phase === 'gift') resetUntil.current = now + 1.5
      seenPhase.current = phase
    }

    if (!initialized.current) {
      initialized.current = true
      c.target.copy(focus)
      camera.position.copy(focus).addScaledVector(CAMERA_OFFSET, portraitZoom(size.width, size.height))
    }

    // Dịch target về phía focus và dịch camera cùng một lượng để giữ góc nhìn.
    delta.copy(focus).sub(c.target).multiplyScalar(damp(dt, 4))
    c.target.add(delta)
    camera.position.add(delta)

    // Lệnh từ nút HUD: áp dụng dần cho mượt.
    if (cameraCmd.rotate !== 0 || cameraCmd.zoom !== 0) {
      const k = damp(dt, 10)
      const rot = cameraCmd.rotate * k
      const zoom = cameraCmd.zoom * k
      cameraCmd.rotate -= rot
      cameraCmd.zoom -= zoom
      if (Math.abs(cameraCmd.rotate) < 1e-4) cameraCmd.rotate = 0
      if (Math.abs(cameraCmd.zoom) < 1e-4) cameraCmd.zoom = 0
      offset.copy(camera.position).sub(c.target)
      offset.applyAxisAngle(Y_AXIS, rot)
      const len = THREE.MathUtils.clamp(offset.length() * Math.pow(0.75, zoom), MIN_DIST, MAX_DIST)
      offset.setLength(len)
      camera.position.copy(c.target).add(offset)
      resetUntil.current = 0
    }

    if (now < resetUntil.current) {
      const off = giftFocus ? GIFT_OFFSET : CAMERA_OFFSET
      desired.copy(c.target).addScaledVector(off, portraitZoom(size.width, size.height))
      camera.position.lerp(desired, damp(dt, 3))
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
      minPolarAngle={0.3}
      maxPolarAngle={Math.PI / 2.1}
    />
  )
}
