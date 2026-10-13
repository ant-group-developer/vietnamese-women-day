import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useJourney } from '../store/useJourney'
import { layout, mascot, stationT } from './path'
import { playStep } from '../audio/sound'

const SPEED = 4.2 // đơn vị/giây
const BODY = '#fff1dc'
const BODY_DARK = '#f4c89a'
const PINK = '#ff8fb3'
const BOW = '#ff5c8a'

const tmpDir = new THREE.Vector3()
const tmpLook = new THREE.Vector3()

/** Chú mèo low-poly dựng từ khối cơ bản, đi theo đường cong. */
export function Character() {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const tail = useRef<THREE.Group>(null)
  const legs = useRef<(THREE.Mesh | null)[]>([])
  const head = useRef<THREE.Group>(null)
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

    // Nhún nhảy khi đi, thở nhẹ khi đứng
    const bounce = walking ? Math.abs(Math.sin(time * 14)) * 0.14 : Math.sin(time * 2) * 0.02
    body.current.position.y = 0.55 + bounce
    body.current.rotation.z = walking ? Math.sin(time * 14) * 0.06 : 0
    body.current.rotation.x = walking ? -0.08 : 0
    if (shadow.current) {
      const s = walking ? 1 - bounce * 0.8 : 1
      shadow.current.scale.set(s, s, 1)
    }
    legs.current.forEach((leg, i) => {
      if (!leg) return
      const phase = i % 2 === 0 ? 0 : Math.PI
      leg.rotation.x = walking ? Math.sin(time * 14 + phase) * 0.7 : 0
    })
    if (tail.current) {
      tail.current.rotation.z = Math.sin(time * (walking ? 10 : 3)) * 0.35
    }
    if (head.current) {
      head.current.rotation.z = walking ? Math.sin(time * 7) * 0.05 : Math.sin(time * 1.5) * 0.04
    }
  })

  return (
    <group ref={root}>
      {/* Bóng đổ mềm dưới chân */}
      <mesh ref={shadow} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 20]} />
        <meshBasicMaterial color="#5a2d44" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <group ref={body} position={[0, 0.55, 0]}>
        {/* Thân */}
        <RoundedBox args={[0.8, 0.62, 1.05]} radius={0.2} smoothness={4} castShadow>
          <meshStandardMaterial color={BODY} />
        </RoundedBox>
        {/* Đốm lưng */}
        <mesh position={[0.1, 0.28, -0.15]} rotation={[0, 0, 0]}>
          <sphereGeometry args={[0.24, 10, 10]} />
          <meshStandardMaterial color={BODY_DARK} />
        </mesh>

        {/* Chân */}
        {[
          [-0.26, -0.36, 0.3],
          [0.26, -0.36, 0.3],
          [-0.26, -0.36, -0.3],
          [0.26, -0.36, -0.3],
        ].map((p, i) => (
          <mesh
            key={i}
            ref={(el) => {
              legs.current[i] = el
            }}
            position={p as [number, number, number]}
            castShadow
          >
            <boxGeometry args={[0.22, 0.34, 0.24]} />
            <meshStandardMaterial color={BODY} />
          </mesh>
        ))}

        {/* Đuôi */}
        <group ref={tail} position={[0, 0.15, -0.55]}>
          <mesh position={[0, 0.3, -0.15]} rotation={[-0.6, 0, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.1, 0.75, 8]} />
            <meshStandardMaterial color={BODY_DARK} />
          </mesh>
          <mesh position={[0, 0.65, -0.33]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color={BODY_DARK} />
          </mesh>
        </group>

        {/* Đầu */}
        <group ref={head} position={[0, 0.62, 0.38]}>
          <RoundedBox args={[0.92, 0.78, 0.82]} radius={0.24} smoothness={4} castShadow>
            <meshStandardMaterial color={BODY} />
          </RoundedBox>
          {/* Tai */}
          {[-0.32, 0.32].map((x) => (
            <group key={x} position={[x, 0.5, 0]} rotation={[0, 0, x > 0 ? -0.25 : 0.25]}>
              <mesh castShadow>
                <coneGeometry args={[0.18, 0.36, 4]} />
                <meshStandardMaterial color={BODY} flatShading />
              </mesh>
              <mesh position={[0, -0.02, 0.06]} scale={[0.6, 0.6, 0.6]}>
                <coneGeometry args={[0.18, 0.36, 4]} />
                <meshStandardMaterial color={PINK} flatShading />
              </mesh>
            </group>
          ))}
          {/* Mắt */}
          {[-0.2, 0.2].map((x) => (
            <group key={x} position={[x, 0.06, 0.4]}>
              <mesh>
                <sphereGeometry args={[0.075, 10, 10]} />
                <meshStandardMaterial color="#3a1f2b" />
              </mesh>
              <mesh position={[0.025, 0.03, 0.05]}>
                <sphereGeometry args={[0.025, 6, 6]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
          {/* Mũi */}
          <mesh position={[0, -0.06, 0.42]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={PINK} />
          </mesh>
          {/* Má hồng */}
          {[-0.33, 0.33].map((x) => (
            <mesh key={x} position={[x, -0.1, 0.36]} scale={[1, 0.7, 0.4]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial color="#ffb3c6" />
            </mesh>
          ))}
          {/* Nơ */}
          <group position={[0.3, 0.42, 0.18]} rotation={[0, 0, -0.3]}>
            {[-0.13, 0.13].map((x) => (
              <mesh key={x} position={[x, 0, 0]} scale={[1, 0.7, 0.5]} castShadow>
                <sphereGeometry args={[0.14, 8, 8]} />
                <meshStandardMaterial color={BOW} />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color="#ff2e70" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}
