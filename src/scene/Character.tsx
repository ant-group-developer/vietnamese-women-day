import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useJourney } from '../store/useJourney'
import { layout, mascot, stationT } from './path'
import { playStep } from '../audio/sound'
import { CHARACTERS, type CharacterSpec } from './characters'

const SPEED = 4.2 // đơn vị/giây

const tmpDir = new THREE.Vector3()
const tmpLook = new THREE.Vector3()

type Ref<T> = React.RefObject<T | null>

function Limb({
  r,
  position,
  length,
  color,
  foot,
  flatFoot,
  swing,
}: {
  r: Ref<THREE.Group>
  position: [number, number, number]
  length: number
  color: string
  foot?: string
  flatFoot?: boolean
  swing?: number
}) {
  return (
    <group ref={r} position={position} rotation={[0, 0, swing ?? 0]}>
      <mesh position={[0, -length / 2, 0]} castShadow>
        <capsuleGeometry args={[0.095, length - 0.19, 6, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {foot && (
        <mesh position={[0, -length, flatFoot ? 0.08 : 0.04]} scale={flatFoot ? [1.5, 0.4, 1.9] : [1, 0.7, 1.3]} castShadow>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshStandardMaterial color={foot} />
        </mesh>
      )}
    </group>
  )
}

/** Nhân vật 2 chân đi theo đường cong; ngoại hình lấy từ CHARACTERS theo lựa chọn trong store. */
export function Character() {
  const characterId = useJourney((s) => s.character)
  const spec: CharacterSpec = CHARACTERS[characterId]
  const limbColor = spec.limb ?? spec.body

  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const heading = useRef(new THREE.Vector3(1, 0, 0))

  useFrame(({ clock }, dt) => {
    const time = clock.elapsedTime
    const { targetIndex, arrive } = useJourney.getState()
    const target = targetIndex === null ? null : stationT(targetIndex)
    let walking = false

    if (target !== null) {
      // Giới hạn dt để không nhảy cóc khi tab bị tạm dừng, nhưng vẫn đủ lớn khi máy yếu.
      const step = (SPEED * Math.min(dt, 0.1)) / layout.length
      const diff = target - mascot.t
      if (Math.abs(diff) <= step) {
        mascot.t = target
        arrive(targetIndex!)
      } else {
        mascot.t += Math.sign(diff) * step
        walking = true
        const tangent = layout.curve.getTangentAt(THREE.MathUtils.clamp(mascot.t, 0, 1))
        tmpDir.copy(tangent).multiplyScalar(Math.sign(diff))
        heading.current.lerp(tmpDir, 0.18)
        playStep(time)
      }
    }
    mascot.walking = walking
    layout.curve.getPointAt(THREE.MathUtils.clamp(mascot.t, 0, 1), mascot.pos)

    if (!root.current || !body.current) return
    root.current.position.copy(mascot.pos)
    tmpLook.copy(mascot.pos).add(heading.current)
    root.current.lookAt(tmpLook)

    const gait = time * 11
    const swing = walking ? Math.sin(gait) : 0
    const sway = spec.waddle ? 0.12 : 0.04
    // Nhún theo bước chân, thở nhẹ khi đứng
    const bounce = walking ? Math.abs(Math.cos(gait)) * 0.07 : Math.sin(time * 2) * 0.015
    body.current.position.y = bounce
    body.current.rotation.z = walking ? Math.sin(gait) * sway : 0
    body.current.rotation.x = walking ? -0.06 : 0
    if (shadow.current) {
      const s = 1 - bounce * 0.6
      shadow.current.scale.set(s, s, 1)
    }
    // Chân trước/sau so le, tay vung ngược chiều chân
    if (legL.current) legL.current.rotation.x = swing * 0.75
    if (legR.current) legR.current.rotation.x = -swing * 0.75
    if (armL.current) armL.current.rotation.x = -swing * 0.55
    if (armR.current) armR.current.rotation.x = swing * 0.55
    if (head.current) {
      head.current.rotation.z = walking ? Math.sin(gait * 0.5) * 0.05 : Math.sin(time * 1.4) * 0.05
      head.current.rotation.y = walking ? 0 : Math.sin(time * 0.9) * 0.08
    }
  })

  return (
    <group ref={root}>
      {/* Bóng đổ mềm dưới chân */}
      <mesh ref={shadow} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#5a2d44" transparent opacity={0.16} depthWrite={false} />
      </mesh>

      <group ref={body} key={spec.id}>
        {/* Chân */}
        <Limb r={legL} position={[-0.16, 0.5, 0]} length={0.42} color={limbColor} foot={spec.shoe} flatFoot={spec.flatFeet} />
        <Limb r={legR} position={[0.16, 0.5, 0]} length={0.42} color={limbColor} foot={spec.shoe} flatFoot={spec.flatFeet} />

        {/* Váy */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.46, 0.5, 32]} />
          <meshStandardMaterial color={spec.dress} />
        </mesh>
        <mesh position={[0, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.45, 0.035, 10, 40]} />
          <meshStandardMaterial color={spec.dressDark} />
        </mesh>
        {/* Thân trên */}
        <mesh position={[0, 0.98, 0]} castShadow>
          <sphereGeometry args={[0.3, 24, 18]} />
          <meshStandardMaterial color={spec.body} />
        </mesh>
        {/* Yếm */}
        <mesh position={[0, 0.95, 0.22]} scale={[1, 1.1, 0.4]}>
          <sphereGeometry args={[0.2, 20, 16]} />
          <meshStandardMaterial color={spec.dress} />
        </mesh>
        {/* Cổ áo */}
        <mesh position={[0, 1.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.05, 10, 32]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Tay */}
        <Limb r={armL} position={[-0.36, 1.05, 0]} length={0.36} color={limbColor} swing={0.35} />
        <Limb r={armR} position={[0.36, 1.05, 0]} length={0.36} color={limbColor} swing={-0.35} />

        {/* Đầu */}
        <group ref={head} position={[0, 1.55, 0.02]}>
          <mesh scale={spec.headScale} castShadow>
            <sphereGeometry args={[0.52, 40, 28]} />
            <meshStandardMaterial color={spec.body} />
          </mesh>
          {spec.head}
        </group>
      </group>
    </group>
  )
}
