import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { Department } from '../data/departments'
import { nextStationIndex, stationStatus, useJourney } from '../store/useJourney'
import { layout } from './path'
import { shade } from './utils'
import { setLabelTarget } from './labels'

interface Props {
  index: number
  dept: Department
}

export function Station({ index, dept }: Props) {
  const status = useJourney((s) => stationStatus(s.visited, index))
  const suggested = useJourney((s) => s.phase === 'journey' && nextStationIndex(s.visited) === index)
  const goTo = useJourney((s) => s.goTo)
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  const popAt = useRef(-1)
  const prevStatus = useRef(status)

  if (prevStatus.current !== status) {
    if (status === 'visited') popAt.current = -2 // đánh dấu: lấy thời gian ở frame tới
    prevStatus.current = status
  }

  const color = dept.color
  const roof = shade(dept.color, -0.28)
  const { housePos } = layout.stations[index]

  useEffect(() => {
    setLabelTarget(`station-${index}`, housePos.clone().add(new THREE.Vector3(0, 3.3, 0)))
  }, [index, housePos])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!group.current) return
    if (popAt.current === -2) popAt.current = t
    let s = 1
    if (suggested) s = 1 + Math.sin(t * 3) * 0.035
    if (hover) s *= 1.06
    if (popAt.current >= 0) {
      const age = t - popAt.current
      if (age < 0.8) s *= 1 + Math.sin(age * Math.PI * 2.5) * Math.exp(-age * 3) * 0.35
    }
    group.current.scale.setScalar(s)
    if (ring.current) {
      const r = 1 + ((t * 0.8) % 1) * 0.6
      ring.current.scale.setScalar(r)
      const mat = ring.current.material as THREE.MeshBasicMaterial
      mat.opacity = suggested ? 0.55 * (1 - ((t * 0.8) % 1)) : 0
    }
  })

  return (
    <group position={housePos}>
      {/* Vòng sáng gợi ý trạm tiếp theo */}
      <mesh ref={ring} position={[0, 0.06, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.3, 40]} />
        <meshBasicMaterial color="#ff7aa8" transparent opacity={0} depthWrite={false} />
      </mesh>

      <group
        ref={group}
        onClick={(e) => {
          e.stopPropagation()
          goTo(index)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {/* Thân nhà */}
        <RoundedBox args={[1.7, 1.3, 1.5]} radius={0.12} smoothness={3} position={[0, 0.65, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={color} flatShading />
        </RoundedBox>
        {/* Mái nhà */}
        <mesh position={[0, 1.78, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[1.45, 1.0, 4]} />
          <meshStandardMaterial color={roof} flatShading />
        </mesh>
        {/* Ống khói */}
        <mesh position={[0.55, 1.9, -0.3]} castShadow>
          <boxGeometry args={[0.28, 0.5, 0.28]} />
          <meshStandardMaterial color={roof} />
        </mesh>
        {/* Cửa */}
        <mesh position={[0, 0.42, 0.76]}>
          <boxGeometry args={[0.46, 0.8, 0.06]} />
          <meshStandardMaterial color="#fff6e9" />
        </mesh>
        <mesh position={[0.13, 0.42, 0.8]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#ffd166" />
        </mesh>
        {/* Cửa sổ */}
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.85, 0.76]}>
            <boxGeometry args={[0.34, 0.34, 0.06]} />
            <meshStandardMaterial color="#cdefff" />
          </mesh>
        ))}
        {/* Hoa trên mái khi đã thăm */}
        {status === 'visited' && (
          <group position={[-0.45, 2.1, 0.35]}>
            <mesh>
              <sphereGeometry args={[0.22, 8, 8]} />
              <meshStandardMaterial color="#ff7aa8" />
            </mesh>
            <mesh position={[0, 0.02, 0.18]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial color="#ffd166" />
            </mesh>
          </group>
        )}
        {/* Bóng bay */}
        {(
          <Float speed={2.2} rotationIntensity={0.2} floatIntensity={0.8}>
            <group position={[0.9, 3.1, 0.2]}>
              <mesh castShadow>
                <sphereGeometry args={[0.32, 12, 12]} />
                <meshStandardMaterial color={shade(dept.color, 0.25)} />
              </mesh>
              <mesh position={[0, -0.6, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.7, 4]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            </group>
          </Float>
        )}
      </group>
    </group>
  )
}
